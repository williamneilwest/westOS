#!/usr/bin/env bash

set -euo pipefail

RULE_PATH="/etc/polkit-1/rules.d/49-cockpit-will.rules"

install -d -m 0755 /etc/polkit-1/rules.d

cat > "$RULE_PATH" <<'EOF'
polkit.addRule(function(action, subject) {
    if (action.id == "org.cockpit-project.cockpit.root-bridge" &&
        subject.user == "will") {
        return polkit.Result.YES;
    }
});
EOF

chmod 0644 "$RULE_PATH"

echo "Installed $RULE_PATH"
echo "Cockpit should stop asking will to turn on admin access after the next session reload."
