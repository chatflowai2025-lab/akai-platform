#!/usr/bin/env python3
"""
RCA #8 — Firestore rules must be deployed to ALL named databases.
Run this after any Firestore rules change OR when a new database is created.
Usage: python3 scripts/deploy-firestore-rules.py
"""
import json, time, base64, urllib.request, urllib.parse, sys, os
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.backends import default_backend

SA_PATH = os.environ.get('FIREBASE_SA_KEY_PATH', '/tmp/akai-sa.json')
RULES_PATH = os.path.join(os.path.dirname(__file__), '..', 'firestore.rules')
PROJECT = 'akai-platform'
# Add new databases here when created
DATABASES = ['cloud.firestore/default', 'cloud.firestore/akai']

def get_token(sa):
    now = int(time.time())
    header = base64.urlsafe_b64encode(json.dumps({"alg":"RS256","typ":"JWT"}).encode()).rstrip(b'=')
    payload = base64.urlsafe_b64encode(json.dumps({
        "iss": sa['client_email'],
        "scope": "https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/datastore",
        "aud": "https://oauth2.googleapis.com/token",
        "exp": now + 3600, "iat": now
    }).encode()).rstrip(b'=')
    signing_input = header + b'.' + payload
    pk = serialization.load_pem_private_key(sa['private_key'].encode(), password=None, backend=default_backend())
    sig = base64.urlsafe_b64encode(pk.sign(signing_input, padding.PKCS1v15(), hashes.SHA256())).rstrip(b'=')
    jwt = (signing_input + b'.' + sig).decode()
    data = urllib.parse.urlencode({'grant_type': 'urn:ietf:params:oauth:grant-type:jwt-bearer', 'assertion': jwt}).encode()
    with urllib.request.urlopen(urllib.request.Request('https://oauth2.googleapis.com/token', data=data)) as r:
        return json.loads(r.read())['access_token']

def api(token, method, url, body=None):
    req = urllib.request.Request(url, data=body, headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}, method=method)
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read()), None
    except urllib.error.HTTPError as e:
        return None, f"{e.code}: {e.read().decode()[:200]}"

if not os.path.exists(SA_PATH):
    print(f"❌ Service account key not found at {SA_PATH}")
    print("   Set FIREBASE_SA_KEY_PATH or place key at /tmp/akai-sa.json")
    sys.exit(1)

with open(SA_PATH) as f:
    sa = json.load(f)

with open(RULES_PATH) as f:
    rules = f.read()

print(f"🔒 Deploying Firestore rules to {PROJECT}...")
token = get_token(sa)

# Create ruleset
data, err = api(token, 'POST', f'https://firebaserules.googleapis.com/v1/projects/{PROJECT}/rulesets',
    json.dumps({"source": {"files": [{"content": rules, "name": "firestore.rules"}]}}).encode())
if err:
    print(f"❌ Failed to create ruleset: {err}")
    sys.exit(1)

ruleset_name = data['name']
print(f"   Ruleset created: {ruleset_name.split('/')[-1]}")

# Deploy to all databases
all_ok = True
for db in DATABASES:
    release_name = f"projects/{PROJECT}/releases/{db}"
    payload = json.dumps({"release": {"name": release_name, "rulesetName": ruleset_name}}).encode()
    _, err = api(token, 'PATCH', f'https://firebaserules.googleapis.com/v1/{release_name}', payload)
    if err:
        print(f"   ❌ {db}: {err}")
        all_ok = False
    else:
        print(f"   ✅ {db}")

if all_ok:
    print(f"\n✅ Rules deployed to all {len(DATABASES)} databases.")
else:
    print(f"\n⚠️  Some databases failed. Check errors above.")
    sys.exit(1)
