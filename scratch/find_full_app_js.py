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
                if "App.js" in target:
                    content = str(args.get("CodeContent", "")) or str(args.get("ReplacementChunks", ""))
                    if "parseHashRoute" in content:
                        print(f"STEP {step.get('step_index')}: found write/replace for App.js")
                        with open(f"/Applications/Arenga/vscode/breakdown_app/scratch/recovered_app_step_{step.get('step_index')}.json", "w") as out:
                            json.dump(args, out, indent=2)
                if "ProjectPage.js" in target:
                    content = str(args.get("CodeContent", "")) or str(args.get("ReplacementChunks", ""))
                    if "buildHashRoute" in content or "changeRoute" in content:
                        print(f"STEP {step.get('step_index')}: found write/replace for ProjectPage.js")
                        with open(f"/Applications/Arenga/vscode/breakdown_app/scratch/recovered_project_step_{step.get('step_index')}.json", "w") as out:
                            json.dump(args, out, indent=2)

print("Done scanning!")
