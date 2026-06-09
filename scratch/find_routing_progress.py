import json

log_path = "/Users/user/.gemini/antigravity-ide/brain/3bcd4aac-4a1b-4686-84cf-4b0e395937cc/.system_generated/logs/transcript.jsonl"
with open(log_path, 'r') as f:
    for line in f:
        step = json.loads(line)
        content = step.get("content", "")
        tool_calls = step.get("tool_calls", [])
        
        # Check if the step index contains key info or we can print full content
        if "routeParser" in content or "parseHashRoute" in content:
            print(f"=== STEP {step.get('step_index')} (Source: {step.get('source')}, Type: {step.get('type')}) ===")
            print(content)
            print("=" * 80)
