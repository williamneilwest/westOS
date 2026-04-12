import os
from flask import Flask, jsonify, request, render_template_string
import requests
from msal import ConfidentialClientApplication
from ldap3 import Server, Connection, ALL
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# -------------------------------
# CONFIG
# -------------------------------
GRAPH_CLIENT_ID = os.getenv("GRAPH_CLIENT_ID")
GRAPH_CLIENT_SECRET = os.getenv("GRAPH_CLIENT_SECRET")
GRAPH_TENANT_ID = os.getenv("GRAPH_TENANT_ID")

AD_SERVER = os.getenv("AD_SERVER")
AD_USER = os.getenv("AD_USER")
AD_PASSWORD = os.getenv("AD_PASSWORD")
AD_BASE_DN = os.getenv("AD_BASE_DN")

AUTHORITY = f"https://login.microsoftonline.com/{GRAPH_TENANT_ID}"
SCOPE = ["https://graph.microsoft.com/.default"]

# -------------------------------
# MSAL SETUP
# -------------------------------
msal_app = ConfidentialClientApplication(
    GRAPH_CLIENT_ID,
    authority=AUTHORITY,
    client_credential=GRAPH_CLIENT_SECRET,
)

def get_graph_token():
    token = msal_app.acquire_token_for_client(scopes=SCOPE)
    return token.get("access_token")

# -------------------------------
# GRAPH LOOKUP
# -------------------------------
def get_graph_user(user_input):
    token = get_graph_token()
    if not token:
        return {"error": "No Graph token"}

    headers = {"Authorization": f"Bearer {token}"}
    url = f"https://graph.microsoft.com/v1.0/users/{user_input}"

    res = requests.get(url, headers=headers)

    if res.status_code != 200:
        return {"error": "Graph lookup failed", "details": res.text}

    d = res.json()

    return {
        "displayName": d.get("displayName"),
        "upn": d.get("userPrincipalName"),
        "email": d.get("mail"),
        "jobTitle": d.get("jobTitle"),
        "department": d.get("department"),
        "office": d.get("officeLocation"),
        "enabled": d.get("accountEnabled"),
    }

# -------------------------------
# AD LOOKUP
# -------------------------------
def get_ad_user(user_input):
    try:
        server = Server(AD_SERVER, get_info=ALL)
        conn = Connection(server, user=AD_USER, password=AD_PASSWORD, auto_bind=True)

        search_filter = f"(|(userPrincipalName={user_input})(sAMAccountName={user_input}))"

        conn.search(
            AD_BASE_DN,
            search_filter,
            attributes=[
                "displayName",
                "mail",
                "sAMAccountName",
                "title",
                "department",
                "physicalDeliveryOfficeName",
                "lastLogonTimestamp",
                "userAccountControl"
            ]
        )

        if not conn.entries:
            return {"error": "AD user not found"}

        e = conn.entries[0]

        return {
            "displayName": str(e.displayName),
            "samAccountName": str(e.sAMAccountName),
            "email": str(e.mail),
            "title": str(e.title),
            "department": str(e.department),
            "office": str(e.physicalDeliveryOfficeName),
            "lastLogon": str(e.lastLogonTimestamp),
            "enabled": not ("2" in str(e.userAccountControl)),
        }

    except Exception as ex:
        return {"error": str(ex)}

# -------------------------------
# MERGE
# -------------------------------
def build_result(graph, ad):
    mismatches = []

    if graph.get("department") != ad.get("department"):
        mismatches.append("Department mismatch")

    if graph.get("jobTitle") != ad.get("title"):
        mismatches.append("Title mismatch")

    if graph.get("enabled") != ad.get("enabled"):
        mismatches.append("Enabled status mismatch")

    return {
        "graph": graph,
        "activeDirectory": ad,
        "mismatches": mismatches
    }

# -------------------------------
# API
# -------------------------------
@app.route("/api/user/<user_input>")
def api_user(user_input):
    graph = get_graph_user(user_input)
    ad = get_ad_user(user_input)
    return jsonify(build_result(graph, ad))

# -------------------------------
# BASIC UI (because JSON sucks)
# -------------------------------
HTML = """
<!DOCTYPE html>
<html>
<head>
    <title>User Lookup</title>
    <style>
        body { font-family: Arial; background: #0f172a; color: white; padding: 20px; }
        input, button { padding: 10px; margin: 5px; border-radius: 8px; border: none; }
        button { background: #22c55e; cursor: pointer; }
        pre { background: #020617; padding: 15px; border-radius: 10px; }
    </style>
</head>
<body>
    <h2>👤 User Lookup Tool</h2>
    <input id="user" placeholder="email or username">
    <button onclick="lookup()">Search</button>
    <pre id="result"></pre>

<script>
async function lookup() {
    const user = document.getElementById("user").value;
    const res = await fetch(`/api/user/${user}`);
    const data = await res.json();
    document.getElementById("result").innerText = JSON.stringify(data, null, 2);
}
</script>
</body>
</html>
"""

@app.route("/")
def home():
    return render_template_string(HTML)

# -------------------------------
# RUN
# -------------------------------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)