// SkillAnalyzer - analyzes skill usage and token consumption
import { pathToFileURL } from "url";
import { isToolPart } from "./types.js";
import { formatErrorMessage } from "./warnings.js";
import { fetchToolList, unwrapResponseData } from "./opencode.js";
export class SkillAnalyzer {
    client;
    tokenizerManager;
    serverUrl;
    directory;
    warnings;
    constructor(client, tokenizerManager, serverUrl, directory, warnings) {
        this.client = client;
        this.tokenizerManager = tokenizerManager;
        this.serverUrl = serverUrl;
        this.directory = directory;
        this.warnings = warnings;
    }
    /**
     * Main entry point - analyzes skill usage in a session
     */
    async analyze(messages, providerID, modelID, tokenModel, config) {
        if (!config.enableSkillAnalysis) {
            return undefined;
        }
        const result = {
            availableSkills: [],
            availableSubagents: [],
            loadedSkills: [],
            totalAvailableTokens: 0,
            totalAvailableSubagentTokens: 0,
            totalLoadedTokens: 0,
            availableSkillsContextTokens: 0,
            skillToolDescriptionTokens: 0,
            taskToolDescriptionTokens: 0,
        };
        try {
            const tools = await this.listTools(providerID, modelID);
            const [agents, skills] = await Promise.all([this.fetchAgents(), this.fetchSkills()]);
            const currentAgent = this.resolveCurrentAgent(messages, agents);
            const accessibleSkills = this.filterAccessibleSkills(skills, currentAgent);
            const accessibleSubagents = this.filterAccessibleSubagents(agents, currentAgent);
            // 1. Get available skills from current OpenCode catalogs / tool metadata
            const availableResult = await this.getAvailableSkills(tools, accessibleSkills, tokenModel);
            result.availableSkills = availableResult.skills;
            result.totalAvailableTokens = availableResult.totalTokens;
            result.availableSkillsContextTokens = availableResult.contextTokens;
            result.skillToolDescriptionTokens = availableResult.descriptionTokens;
            // 2. Get available subagents from current OpenCode catalogs / task tool description
            const subagentResult = await this.getAvailableSubagents(tools, accessibleSubagents, tokenModel);
            result.availableSubagents = subagentResult.subagents;
            result.totalAvailableSubagentTokens = subagentResult.totalTokens;
            result.taskToolDescriptionTokens = subagentResult.descriptionTokens;
            // 3. Get loaded skills from session messages
            const loadedResult = await this.getLoadedSkills(messages, tokenModel);
            result.loadedSkills = loadedResult.skills;
            result.totalLoadedTokens = loadedResult.totalTokens;
        }
        catch (error) {
            this.warnings?.add(`Skill analysis was skipped: ${formatErrorMessage(error)}`, "skill-analysis");
        }
        return result;
    }
    /**
     * Fetch current tool definitions for the provider/model
     */
    async listTools(providerID, modelID) {
        try {
            const response = await fetchToolList(this.client, providerID, modelID, { directory: this.directory });
            const tools = unwrapResponseData(response ?? []);
            return Array.isArray(tools) ? tools : [];
        }
        catch (error) {
            this.warnings?.add(`Could not fetch tool metadata for ${providerID}/${modelID}. Skill and subagent catalog sections were skipped: ${formatErrorMessage(error)}`, `tool-list:${providerID}:${modelID}`);
            return [];
        }
    }
    /**
     * Fetch available skills from current OpenCode APIs when possible.
     * Falls back to parsing the tool description for older versions.
     */
    async getAvailableSkills(tools, availableSkills, tokenModel) {
        const skills = [];
        let totalTokens = 0;
        let contextTokens = 0;
        let descriptionTokens = 0;
        try {
            if (availableSkills) {
                const sortedSkills = availableSkills
                    .filter((skill) => typeof skill.description === "string")
                    .sort((a, b) => a.name.localeCompare(b.name));
                const skillToolDescription = this.buildSkillToolDescription(sortedSkills);
                descriptionTokens = await this.tokenizerManager.countTokens(skillToolDescription, tokenModel);
                const systemPromptCatalog = this.buildSkillSystemPrompt(sortedSkills);
                contextTokens = await this.tokenizerManager.countTokens(systemPromptCatalog, tokenModel);
                for (const skill of sortedSkills) {
                    const entry = this.buildVerboseSkillEntry(skill);
                    const tokens = await this.tokenizerManager.countTokens(entry, tokenModel);
                    skills.push({
                        name: skill.name,
                        description: skill.description,
                        tokens,
                    });
                    totalTokens += tokens;
                }
                return { skills, totalTokens, contextTokens, descriptionTokens };
            }
            const skillTool = tools.find((t) => t.id === "skill");
            if (!skillTool?.description) {
                return { skills, totalTokens, contextTokens, descriptionTokens };
            }
            descriptionTokens = await this.tokenizerManager.countTokens(skillTool.description, tokenModel);
            const parsedSkills = this.parseAvailableSkills(skillTool.description);
            for (const skill of parsedSkills) {
                const tokens = await this.tokenizerManager.countTokens(skill.rawText, tokenModel);
                skills.push({
                    name: skill.name,
                    description: skill.description,
                    tokens,
                });
                totalTokens += tokens;
            }
        }
        catch (error) {
            this.warnings?.add(`Available skill estimates were skipped: ${formatErrorMessage(error)}`, "available-skills");
        }
        return { skills, totalTokens, contextTokens, descriptionTokens };
    }
    /**
     * Fetch available subagents from current OpenCode APIs when possible.
     * Falls back to parsing the task tool description for older versions.
     */
    async getAvailableSubagents(tools, availableSubagents, tokenModel) {
        const subagents = [];
        let totalTokens = 0;
        let descriptionTokens = 0;
        try {
            const taskTool = tools.find((t) => t.id === "task");
            if (availableSubagents) {
                const sortedSubagents = [...availableSubagents].sort((a, b) => a.name.localeCompare(b.name));
                if (taskTool?.description) {
                    const filteredDescription = this.buildFilteredTaskDescription(taskTool.description, sortedSubagents);
                    descriptionTokens = await this.tokenizerManager.countTokens(filteredDescription, tokenModel);
                }
                for (const subagent of sortedSubagents) {
                    const rawText = this.buildSubagentBullet(subagent);
                    const tokens = await this.tokenizerManager.countTokens(rawText, tokenModel);
                    subagents.push({
                        name: subagent.name,
                        description: this.getSubagentDescription(subagent),
                        tokens,
                    });
                    totalTokens += tokens;
                }
                return { subagents, totalTokens, descriptionTokens };
            }
            if (!taskTool?.description) {
                return { subagents, totalTokens, descriptionTokens };
            }
            descriptionTokens = await this.tokenizerManager.countTokens(taskTool.description, tokenModel);
            const parsedSubagents = this.parseAvailableSubagents(taskTool.description);
            for (const subagent of parsedSubagents) {
                const tokens = await this.tokenizerManager.countTokens(subagent.rawText, tokenModel);
                subagents.push({
                    name: subagent.name,
                    description: subagent.description,
                    tokens,
                });
                totalTokens += tokens;
            }
        }
        catch (error) {
            this.warnings?.add(`Available subagent estimates were skipped: ${formatErrorMessage(error)}`, "available-subagents");
        }
        return { subagents, totalTokens, descriptionTokens };
    }
    /**
     * Parse available subagents from the task tool description.
     */
    parseAvailableSubagents(description) {
        const subagents = [];
        const lines = description.split(/\r?\n/);
        const startIndex = lines.findIndex((line) => /available agent types/i.test(line));
        if (startIndex === -1) {
            return subagents;
        }
        let parsedAnyEntries = false;
        let sawBlankAfterEntries = false;
        for (let i = startIndex + 1; i < lines.length; i++) {
            const trimmed = lines[i].trim();
            if (this.isSubagentSectionBoundary(trimmed)) {
                break;
            }
            if (trimmed.length === 0) {
                if (parsedAnyEntries) {
                    sawBlankAfterEntries = true;
                }
                continue;
            }
            if (!trimmed.startsWith("- ")) {
                if (parsedAnyEntries) {
                    break;
                }
                continue;
            }
            if (sawBlankAfterEntries) {
                break;
            }
            const content = trimmed.slice(2).trim();
            const firstColon = content.indexOf(":");
            if (firstColon <= 0) {
                continue;
            }
            const name = content.slice(0, firstColon).trim();
            const rawDescription = content.slice(firstColon + 1).trim();
            if (!name || !rawDescription) {
                continue;
            }
            if (!this.isLikelyIdentifier(name)) {
                continue;
            }
            subagents.push({
                name,
                description: rawDescription.replace(/\s+/g, " ").trim(),
                rawText: `- ${name}: ${rawDescription}`,
            });
            parsedAnyEntries = true;
        }
        return subagents;
    }
    /**
     * Parse the available skills list from both current markdown and legacy XML formats.
     */
    parseAvailableSkills(description) {
        const xmlSkills = this.parseAvailableSkillsXml(description);
        if (xmlSkills.length > 0) {
            return xmlSkills;
        }
        return this.parseAvailableSkillsMarkdown(description);
    }
    parseAvailableSkillsXml(description) {
        const skills = [];
        const availableSkillsMatch = description.match(/<available_skills>([\s\S]*?)<\/available_skills>/i);
        if (!availableSkillsMatch) {
            return skills;
        }
        const xmlContent = availableSkillsMatch[1];
        const skillBlockRegex = /<skill>([\s\S]*?)<\/skill>/gi;
        let blockMatch;
        while ((blockMatch = skillBlockRegex.exec(xmlContent)) !== null) {
            const block = blockMatch[0];
            const body = blockMatch[1];
            const nameMatch = body.match(/<name>([\s\S]*?)<\/name>/i);
            const descriptionMatch = body.match(/<description>([\s\S]*?)<\/description>/i);
            const name = nameMatch?.[1]?.trim() ?? "";
            const skillDescription = descriptionMatch?.[1]?.trim() ?? "";
            if (!name || !skillDescription) {
                continue;
            }
            skills.push({
                name,
                description: skillDescription,
                rawText: block,
            });
        }
        return skills;
    }
    parseAvailableSkillsMarkdown(description) {
        const skills = [];
        const lines = description.split(/\r?\n/);
        const startIndex = lines.findIndex((line) => /^##\s+available skills\s*$/i.test(line.trim()));
        if (startIndex === -1) {
            return skills;
        }
        let parsedAnyEntries = false;
        for (let i = startIndex + 1; i < lines.length; i++) {
            const trimmed = lines[i].trim();
            if (!trimmed) {
                if (parsedAnyEntries) {
                    break;
                }
                continue;
            }
            if (/^#{1,6}\s/.test(trimmed)) {
                break;
            }
            const match = trimmed.match(/^-\s+\*\*([^*]+)\*\*:\s*(.+)$/) ?? trimmed.match(/^-\s+([^:]+):\s*(.+)$/);
            if (!match) {
                if (parsedAnyEntries) {
                    break;
                }
                continue;
            }
            const name = match[1]?.trim() ?? "";
            const skillDescription = match[2]?.trim() ?? "";
            if (!name || !skillDescription || !this.isLikelyIdentifier(name)) {
                continue;
            }
            skills.push({
                name,
                description: skillDescription.replace(/\s+/g, " ").trim(),
                rawText: trimmed,
            });
            parsedAnyEntries = true;
        }
        return skills;
    }
    isLikelyIdentifier(name) {
        return /^[A-Za-z0-9][A-Za-z0-9._-]{0,80}$/.test(name);
    }
    isSubagentSectionBoundary(line) {
        if (!line) {
            return false;
        }
        return (/^#{1,6}\s/.test(line) ||
            /^<example>/i.test(line) ||
            /^when\s+using\s+the\s+task\s+tool/i.test(line) ||
            /^when\s+to\s+use\s+the\s+task\s+tool/i.test(line) ||
            /^usage\s+notes:/i.test(line) ||
            /^examples?:/i.test(line));
    }
    /**
     * Collect loaded skills from session messages with call count tracking.
     */
    async getLoadedSkills(messages, tokenModel) {
        const skillMap = new Map();
        let totalTokens = 0;
        let messageIndex = 0;
        for (const message of messages) {
            if (message.info.role === "user" || message.info.role === "assistant") {
                messageIndex++;
            }
            for (const part of message.parts) {
                if (!isToolPart(part))
                    continue;
                if (part.tool !== "skill")
                    continue;
                if (part.state.status !== "completed")
                    continue;
                const skillName = this.extractSkillName(part.state);
                if (!skillName)
                    continue;
                const content = (part.state.output ?? "").toString().trim();
                if (!content)
                    continue;
                const existing = skillMap.get(skillName);
                if (existing) {
                    existing.callCount++;
                }
                else {
                    const tokens = await this.tokenizerManager.countTokens(content, tokenModel);
                    skillMap.set(skillName, {
                        name: skillName,
                        callCount: 1,
                        firstMessageIndex: messageIndex,
                        tokens,
                        content: content.length > 500 ? content.substring(0, 500) + "..." : content,
                    });
                }
            }
        }
        const skills = [];
        for (const [, skillData] of skillMap) {
            const totalSkillTokens = skillData.tokens * skillData.callCount;
            skills.push({
                name: skillData.name,
                callCount: skillData.callCount,
                firstMessageIndex: skillData.firstMessageIndex,
                tokens: skillData.tokens,
                totalTokens: totalSkillTokens,
                content: skillData.content,
            });
            totalTokens += totalSkillTokens;
        }
        skills.sort((a, b) => b.totalTokens - a.totalTokens);
        return { skills, totalTokens };
    }
    /**
     * Extract skill name from tool state.
     */
    extractSkillName(state) {
        if (state.input && typeof state.input === "object" && state.input.name) {
            return String(state.input.name);
        }
        if (state.metadata && typeof state.metadata === "object" && state.metadata.name) {
            return String(state.metadata.name);
        }
        if (state.title && typeof state.title === "string") {
            const match = state.title.match(/Loaded skill:\s*(.+)/i);
            if (match) {
                return match[1].trim();
            }
        }
        return undefined;
    }
    resolveCurrentAgent(messages, agents) {
        if (!agents || agents.length === 0) {
            return undefined;
        }
        const agentName = [...messages]
            .reverse()
            .map((message) => message.info.agent)
            .find((value) => typeof value === "string" && value.trim().length > 0);
        if (!agentName) {
            return undefined;
        }
        return agents.find((agent) => agent.name === agentName);
    }
    filterAccessibleSkills(skills, currentAgent) {
        if (!skills) {
            return undefined;
        }
        const rules = this.getPermissionRules(currentAgent?.permission);
        const filtered = rules
            ? skills.filter((skill) => this.evaluatePermission("skill", skill.name, rules).action !== "deny")
            : skills;
        return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    }
    filterAccessibleSubagents(agents, currentAgent) {
        if (!agents) {
            return undefined;
        }
        const rules = this.getPermissionRules(currentAgent?.permission);
        const subagents = agents.filter((agent) => agent.mode !== "primary");
        const filtered = rules
            ? subagents.filter((agent) => this.evaluatePermission("task", agent.name, rules).action !== "deny")
            : subagents;
        return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    }
    getPermissionRules(value) {
        if (!Array.isArray(value)) {
            return undefined;
        }
        const rules = value.filter((item) => !!item &&
            typeof item === "object" &&
            typeof item.permission === "string" &&
            typeof item.pattern === "string" &&
            typeof item.action === "string");
        return rules.length > 0 ? rules : undefined;
    }
    evaluatePermission(permission, pattern, ruleset) {
        const match = [...ruleset]
            .reverse()
            .find((rule) => this.matchesWildcard(permission, rule.permission) && this.matchesWildcard(pattern, rule.pattern));
        return match ?? { permission, pattern: "*", action: "ask" };
    }
    matchesWildcard(value, pattern) {
        const normalizedValue = value.replaceAll("\\", "/");
        const normalizedPattern = pattern.replaceAll("\\", "/");
        let escaped = normalizedPattern
            .replace(/[.+^${}()|[\]\\]/g, "\\$&")
            .replace(/\*/g, ".*")
            .replace(/\?/g, ".");
        if (escaped.endsWith(" .*")) {
            escaped = escaped.slice(0, -3) + "( .*)?";
        }
        const flags = process.platform === "win32" ? "si" : "s";
        return new RegExp("^" + escaped + "$", flags).test(normalizedValue);
    }
    buildVerboseSkillEntry(skill) {
        const lines = [
            "  <skill>",
            `    <name>${skill.name}</name>`,
            `    <description>${skill.description}</description>`,
        ];
        if (skill.location) {
            lines.push(`    <location>${pathToFileURL(skill.location).href}</location>`);
        }
        lines.push("  </skill>");
        return lines.join("\n");
    }
    buildSkillSystemPrompt(skills) {
        return [
            "Skills provide specialized instructions and workflows for specific tasks.",
            "Use the skill tool to load a skill when a task matches its description.",
            skills.length > 0 ? this.buildVerboseSkillCatalog(skills) : "No skills are currently available.",
        ].join("\n");
    }
    buildVerboseSkillCatalog(skills) {
        return ["<available_skills>", ...skills.map((skill) => this.buildVerboseSkillEntry(skill)), "</available_skills>"].join("\n");
    }
    buildSkillToolDescription(skills) {
        if (skills.length === 0) {
            return "Load a specialized skill that provides domain-specific instructions and workflows. No skills are currently available.";
        }
        return [
            "Load a specialized skill that provides domain-specific instructions and workflows.",
            "",
            "When you recognize that a task matches one of the available skills listed below, use this tool to load the full skill instructions.",
            "",
            "The skill will inject detailed instructions, workflows, and access to bundled resources (scripts, references, templates) into the conversation context.",
            "",
            'Tool output includes a `<skill_content name="...">` block with the loaded content.',
            "",
            "The following skills provide specialized sets of instructions for particular tasks",
            "Invoke this tool to load a skill when a task matches one of the available skills listed below:",
            "",
            [
                "## Available Skills",
                ...skills.map((skill) => `- **${skill.name}**: ${skill.description}`),
            ].join("\n"),
        ].join("\n");
    }
    buildSubagentBullet(agent) {
        return `- ${agent.name}: ${this.getSubagentDescription(agent)}`;
    }
    getSubagentDescription(agent) {
        return agent.description ?? "This subagent should only be called manually by the user.";
    }
    buildFilteredTaskDescription(description, agents) {
        const lines = description.split(/\r?\n/);
        const headerIndex = lines.findIndex((line) => /available agent types/i.test(line));
        const nextSectionIndex = lines.findIndex((line, index) => index > headerIndex && /^When using the Task tool:/i.test(line.trim()));
        if (headerIndex === -1 || nextSectionIndex === -1) {
            return description;
        }
        return [
            ...lines.slice(0, headerIndex + 1),
            ...agents.map((agent) => this.buildSubagentBullet(agent)),
            "",
            ...lines.slice(nextSectionIndex),
        ].join("\n");
    }
    async fetchAgents() {
        try {
            const agents = await this.fetchInternalJson("agent");
            if (Array.isArray(agents)) {
                return agents;
            }
        }
        catch { }
        try {
            const appAgents = this.client?.app?.agents;
            if (typeof appAgents === "function") {
                const response = await appAgents.call(this.client.app);
                const agents = response?.data ?? response;
                if (Array.isArray(agents)) {
                    return agents;
                }
            }
        }
        catch { }
        return undefined;
    }
    async fetchSkills() {
        try {
            const skills = await this.fetchInternalJson("skill");
            if (Array.isArray(skills)) {
                return skills;
            }
        }
        catch { }
        try {
            const appSkills = this.client?.app?.skills;
            if (typeof appSkills === "function") {
                const response = await appSkills.call(this.client.app);
                const skills = response?.data ?? response;
                if (Array.isArray(skills)) {
                    return skills;
                }
            }
        }
        catch { }
        return undefined;
    }
    async fetchInternalJson(pathname) {
        const base = new URL(this.serverUrl);
        if (!base.pathname.endsWith("/")) {
            base.pathname += "/";
        }
        const url = new URL(pathname.replace(/^\//, ""), base);
        url.searchParams.set("directory", this.directory);
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Request failed (${response.status} ${response.statusText})`);
        }
        return (await response.json());
    }
}
//# sourceMappingURL=skill.js.map