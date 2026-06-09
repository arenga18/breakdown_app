import json
import os

log_path = "/Users/user/.gemini/antigravity-ide/brain/3bcd4aac-4a1b-4686-84cf-4b0e395937cc/.system_generated/logs/transcript.jsonl"
out_dir = "/Applications/Arenga/vscode/breakdown_app/scratch"

with open(log_path, 'r') as f:
    for line in f:
        step = json.loads(line)
        step_idx = step.get("step_index")
        
        # Check tool calls in step
        tool_calls = step.get("tool_calls") or []
        for tc in tool_calls:
            args = tc.get("args") or {}
            args_str = str(args)
            if "parseHashRoute" in args_str or "buildHashRoute" in args_str:
                print(f"Match found in tool args of step {step_idx}: tool={tc.get('name')}")
                # Write to a file
                out_name = f"step_{step_idx}_{tc.get('name')}.json"
                with open(os.path.join(out_dir, out_name), 'w') as out_f:
                    json.dump(args, out_f, indent=2)
                print(f"  Saved to {out_name}")
                
        # Check content
        content = step.get("content") or ""
        if "parseHashRoute" in content or "buildHashRoute" in content:
            print(f"Match found in content of step {step_idx}")
            out_name = f"step_{step_idx}_content.txt"
            with open(os.path.join(out_dir, out_name), 'w') as out_f:
                out_f.write(content)
            print(f"  Saved to {out_name}")

print("Done scanning transcript!")
