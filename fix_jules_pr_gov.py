with open('.github/workflows/jules-pr-governance.yml', 'r') as f:
    content = f.read()

content = content.replace("require('./.github/scripts/jules-pr-governance.cjs')", "require(require('path').resolve(process.env.GITHUB_WORKSPACE, '.github/scripts/jules-pr-governance.cjs'))")

with open('.github/workflows/jules-pr-governance.yml', 'w') as f:
    f.write(content)
