import sys

def modify_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Find the mutation string
    mutation_str = """
      `
        mutation ConvertPullRequestToDraft($pullRequestId: ID!) {
          convertPullRequestToDraft(input: { pullRequestId: $pullRequestId }) {
            pullRequest {
              id
              isDraft
            }
          }
        }
      `,
"""
    # Just catch the errors so it won't crash the workflow
    if "convertPrToDraft(" in content:
        content = content.replace("await convertPrToDraft(pr.node_id);", "try { await convertPrToDraft(pr.node_id); } catch(e) { core.warning(`Could not convert PR to draft: ${e.message}`); }")
        with open(filepath, 'w') as f:
            f.write(content)
        print("Updated file successfully")
    else:
        print("Could not find the target code to replace")

if __name__ == "__main__":
    modify_file('.github/scripts/jules-pr-governance.cjs')
