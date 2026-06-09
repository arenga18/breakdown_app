import json

log_path = "/Users/user/.gemini/antigravity-ide/brain/3bcd4aac-4a1b-4686-84cf-4b0e395937cc/.system_generated/logs/transcript.jsonl"

with open(log_path, 'r') as f:
    for line in f:
        step = json.loads(line)
        if step.get("step_index") == 1035:
            print("=== STEP 1035 ===")
            print(json.dumps(step, indent=2))
            break
