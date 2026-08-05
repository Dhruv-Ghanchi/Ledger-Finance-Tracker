import urllib.request
import json
import os

file_path = r'd:\expense tracker\IMG_20260804_205349843-2.pdf'
boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'
with open(file_path, 'rb') as fp:
    content = fp.read()
    
body = (
    f'--{boundary}\r\n'
    f'Content-Disposition: form-data; name="file"; filename="IMG_20260804_205349843-2.pdf"\r\n'
    f'Content-Type: application/pdf\r\n\r\n'
).encode('utf-8') + content + f'\r\n--{boundary}--\r\n'.encode('utf-8')

req = urllib.request.Request('http://localhost:8000/api/entries/import', data=body, headers={
    'Authorization': 'Bearer mock_token',
    'Content-Type': f'multipart/form-data; boundary={boundary}'
})

try:
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        amount_inr = data.get('amount', 0) / 100.0
        print(f"SUCCESS: Note='{data.get('note')}', Date='{data.get('date')}', Category='{data.get('category')}', Scope='{data.get('scope')}', Amount=Rs {amount_inr:.2f}")
except Exception as err:
    print("ERROR:", err)
