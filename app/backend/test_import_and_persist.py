import urllib.request
import json
import os

url = 'http://localhost:8000/api/entries/import'
headers = {'Authorization': 'Bearer mock_token'}

print("--- Uploading & Auto-saving Receipts ---")
for img in ['image.png', 'image copy.png', 'image copy 2.png']:
    file_path = os.path.join(r'd:\expense tracker', img)
    boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'
    with open(file_path, 'rb') as f:
        content = f.read()
    
    body = (
        f'--{boundary}\r\n'
        f'Content-Disposition: form-data; name="file"; filename="{img}"\r\n'
        f'Content-Type: image/png\r\n\r\n'
    ).encode('utf-8') + content + f'\r\n--{boundary}--\r\n'.encode('utf-8')
    
    req = urllib.request.Request(url, data=body, headers={
        'Authorization': 'Bearer mock_token',
        'Content-Type': f'multipart/form-data; boundary={boundary}'
    })
    
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            print(f'Imported & Saved {img}:', data.get('note'), f"₹{data.get('amount')}")
    except Exception as e:
        print(f'Error importing {img}:', e)

print("\n--- Verifying Entries in MongoDB Atlas Ledger ---")
req_entries = urllib.request.Request('http://localhost:8000/api/entries', headers=headers)
with urllib.request.urlopen(req_entries) as resp:
    entries = json.loads(resp.read().decode('utf-8'))
    print(f"Total entries found in MongoDB Atlas ledger: {len(entries)}")
    for entry in entries[:10]:
        print(f" - [{entry.get('date')}] {entry.get('note')}: ₹{entry.get('amount')} ({entry.get('category')}, {entry.get('scope')})")
