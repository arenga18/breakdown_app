import json

log_path = "/Users/user/.gemini/antigravity-ide/brain/3bcd4aac-4a1b-4686-84cf-4b0e395937cc/.system_generated/logs/transcript.jsonl"

with open(log_path, 'r') as f:
    for line in f:
        step = json.loads(line)
        tool_calls = step.get("tool_calls", [])
        for tc in tool_calls:
            if tc.get("name") in ["write_to_file", "replace_file_content", "multi_replace_file_content"]:
                args = tc.get("args", {})
                target = args.get("TargetFile", "")
                if "ProjectPage.js" in target:
                    print(f"STEP {step.get('step_index')}: {tc.get('name')} for ProjectPage.js")
                    print(f"  Summary/Instruction: {args.get('Instruction') or args.get('Description')}")

print("Scan finished!")
