import os
import json
import re
import subprocess

sessions = [
    'f9aaf194-c24f-4186-9efc-4b2af4d6c5e5',
    'b610fad2-2b0b-4439-822f-2878f170d977',
    '11fa2b3a-7f48-4084-9650-471f95087cca',
    '47615195-1e53-417d-9e0f-866aafeb6568',
    '3bcd4aac-4a1b-4686-84cf-4b0e395937cc'
]
base_brain = '/Users/user/.gemini/antigravity-ide/brain'
workspace_dir = '/Applications/Arenga/vscode/breakdown_app'

# Target files to recover
TARGET_FILES = {
    'src/components/ReportPage.js',
    'src/components/PartPage.js',
    'src/App.js',
    'src/partsData.js',
    'src/utils/calc.js',
    'src/utils/resolveAlias.js',
    'src/components/BreakdownPage.js',
    'src/components/CategoryPage.js',
    'src/components/ModulPage.js',
    'src/components/ModulTemplatePage.js',
    'src/components/ModuleEditor.js',
    'src/components/ProjectPage.js',
    'src/components/RekapPage.js',
    'src/components/SharedModuleTable.js',
    'src/components/SpekPage.js',
    'src/components/StockPage.js',
    'src/components/SubModulPage.js',
    'src/components/SubModulTemplatePage.js',
    'src/components/TemplatePage.js',
    'src/stockData.js'
}

target_abs_to_rel = {}
for tf in TARGET_FILES:
    abs_p = os.path.abspath(os.path.join(workspace_dir, tf))
    target_abs_to_rel[abs_p] = tf

def decode_json_recursively(val):
    if isinstance(val, str):
        try:
            parsed = json.loads(val)
            if parsed != val:
                return decode_json_recursively(parsed)
        except:
            val_stripped = val.strip()
            if len(val_stripped) >= 2:
                if (val_stripped.startswith('"') and val_stripped.endswith('"')) or (val_stripped.startswith("'") and val_stripped.endswith("'")):
                    try:
                        return decode_json_recursively(val_stripped[1:-1])
                    except:
                        pass
        return val
    elif isinstance(val, dict):
        return {k: decode_json_recursively(v) for k, v in val.items()}
    elif isinstance(val, list):
        return [decode_json_recursively(item) for item in val]
    return val

def to_int(val, default):
    if val is None: return default
    try:
        return int(val)
    except:
        return default

all_events = []

for sid in sessions:
    path = f'{base_brain}/{sid}/.system_generated/logs/transcript.jsonl'
    if not os.path.exists(path):
        print(f"Skipping session {sid[:8]} (not found)")
        continue
    
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line: continue
            try:
                obj = json.loads(line)
            except:
                continue
            
            created_at = obj.get('created_at', '')
            step_idx = obj.get('step_index', 0)
            
            tool_calls = obj.get('tool_calls') or []
            for tc in tool_calls:
                name = tc.get('name')
                args = tc.get('args') or {}
                
                decoded_args = decode_json_recursively(args)
                
                if name in ('write_to_file', 'replace_file_content', 'multi_replace_file_content'):
                    target = decoded_args.get('TargetFile', '')
                    if not target: continue
                    abs_target = os.path.abspath(target)
                    if abs_target in target_abs_to_rel:
                        all_events.append({
                            'session': sid,
                            'created_at': created_at,
                            'step_index': step_idx,
                            'tool': name,
                            'args': decoded_args,
                            'target_abs': abs_target,
                            'target_rel': target_abs_to_rel[abs_target]
                        })

all_events.sort(key=lambda x: (x['created_at'], x['step_index']))
print(f"Collected {len(all_events)} events for target files.")

reconstructed = {}

def get_git_base(rel_path):
    try:
        res = subprocess.run(['git', 'show', f'HEAD:{rel_path}'], capture_output=True, text=True, cwd=workspace_dir)
        if res.returncode == 0:
            return res.stdout
    except Exception as e:
        pass
    return ""

def whitespace_insensitive_replace(content, target_content, replacement_content):
    parts = re.split(r'(\s+)', target_content)
    pattern_parts = []
    for i, part in enumerate(parts):
        if not part:
            continue
        if part.isspace():
            prev_is_word = False
            next_is_word = False
            if i > 0 and parts[i-1] and re.match(r'^\w+$', parts[i-1]):
                prev_is_word = True
            if i < len(parts) - 1 and parts[i+1] and re.match(r'^\w+$', parts[i+1]):
                next_is_word = True
            
            if prev_is_word and next_is_word:
                pattern_parts.append(r'\s+')
            else:
                pattern_parts.append(r'\s*')
        else:
            pattern_parts.append(re.escape(part))
            
    pattern = "".join(pattern_parts)
    try:
        rx = re.compile(pattern)
        matches = list(rx.finditer(content))
        if len(matches) == 1:
            match = matches[0]
            start, end = match.span()
            return content[:start] + replacement_content + content[end:]
        elif len(matches) > 1:
            print(f"Warning: multiple regex matches found. Replacing the first one.")
            match = matches[0]
            start, end = match.span()
            return content[:start] + replacement_content + content[end:]
    except Exception as e:
        print(f"Regex error: {e}")
    return None

def apply_replace(content, target_content, replacement_content, start_line, end_line):
    content_norm = content.replace('\r\n', '\n')
    target_norm = target_content.replace('\r\n', '\n')
    repl_norm = replacement_content.replace('\r\n', '\n')
    
    lines = content_norm.splitlines(keepends=True)
    start_idx = max(0, start_line - 1)
    end_idx = min(len(lines), end_line)
    
    if start_idx < len(lines):
        target_lines = lines[start_idx:end_idx]
        target_str = "".join(target_lines)
        if target_norm in target_str:
            new_target_str = target_str.replace(target_norm, repl_norm)
            new_lines = lines[:start_idx] + [new_target_str] + lines[end_idx:]
            return "".join(new_lines)
            
    if target_norm in content_norm:
        if content_norm.count(target_norm) == 1:
            return content_norm.replace(target_norm, repl_norm)
        else:
            return content_norm.replace(target_norm, repl_norm)
            
    res = whitespace_insensitive_replace(content_norm, target_norm, repl_norm)
    if res is not None:
        return res
        
    print(f"Error: Target content not found in file: {repr(target_norm)[:120]}")
    return content_norm

for ev in all_events:
    rel = ev['target_rel']
    tool = ev['tool']
    args = ev['args']
    
    if rel not in reconstructed:
        reconstructed[rel] = get_git_base(rel)
        
    current_content = reconstructed[rel]
    
    try:
        if tool == 'write_to_file':
            code = args.get('CodeContent', '')
            reconstructed[rel] = code.replace('\r\n', '\n')
            print(f"[{ev['session'][:8]} step={ev['step_index']}] write_to_file {rel} ({len(code)} chars)")
            
        elif tool == 'replace_file_content':
            target_content = args.get('TargetContent', '')
            replacement_content = args.get('ReplacementContent', '')
            start_line = to_int(args.get('StartLine'), 1)
            end_line = to_int(args.get('EndLine'), len(current_content.splitlines()) + 1)
            
            new_content = apply_replace(current_content, target_content, replacement_content, start_line, end_line)
            reconstructed[rel] = new_content
            print(f"[{ev['session'][:8]} step={ev['step_index']}] replace_file_content {rel}")
            
        elif tool == 'multi_replace_file_content':
            chunks = args.get('ReplacementChunks', [])
            if isinstance(chunks, str):
                try: chunks = json.loads(chunks)
                except: chunks = []
            
            chunks_clean = []
            if isinstance(chunks, list):
                for chunk in chunks:
                    if isinstance(chunk, str):
                        try: chunk = json.loads(chunk)
                        except: pass
                    if isinstance(chunk, dict):
                        chunks_clean.append(chunk)
            
            chunks_sorted = sorted(chunks_clean, key=lambda c: to_int(c.get('StartLine'), 1), reverse=True)
            
            new_content = current_content
            for chunk in chunks_sorted:
                target_content = chunk.get('TargetContent', '')
                replacement_content = chunk.get('ReplacementContent', '')
                start_line = to_int(chunk.get('StartLine'), 1)
                end_line = to_int(chunk.get('EndLine'), len(new_content.splitlines()) + 1)
                new_content = apply_replace(new_content, target_content, replacement_content, start_line, end_line)
                
            reconstructed[rel] = new_content
            print(f"[{ev['session'][:8]} step={ev['step_index']}] multi_replace_file_content {rel} ({len(chunks_clean)} chunks)")
            
    except Exception as e:
        print(f"Error applying event [{ev['session'][:8]} step={ev['step_index']}] on {rel}: {e}")

# Write reconstructed files to a temp directory in workspace
out_dir = os.path.join(workspace_dir, 'recovered_src')
os.makedirs(out_dir, exist_ok=True)

for rel, content in reconstructed.items():
    out_path = os.path.join(out_dir, rel)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, 'w') as f:
        f.write(content)
    print(f"Wrote recovered file: {out_path}")
