#!/usr/bin/env python3
"""
Linear CSV Importer
Imports tickets from CSV into Linear using GraphQL API
"""

import csv
import requests
import json
import time

# ============================================================================
# CONFIGURATION - FILL THESE IN
# ============================================================================

LINEAR_API_KEY = "lin_api_KiKHs8dY2NgpZ0nTNyuV07LEmUgQiooXfcXthCeI"  # Get from: Linear → Settings → Account → API
TEAM_ID = "3821af06-f13d-403f-8e6b-46e053b6155f"         # See instructions below to find this
PROJECT_ID = "b89210fa-8931-4fff-b920-17f72accb4ea"   # See instructions below to find this

# Linear API endpoint
LINEAR_API_URL = "https://api.linear.app/graphql"

# CSV file path
CSV_FILE = "v2_ai_coaching_tickets.csv"

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def graphql_request(query, variables=None):
    """Make a GraphQL request to Linear API"""
    headers = {
        "Authorization": LINEAR_API_KEY,
        "Content-Type": "application/json"
    }

    payload = {"query": query}
    if variables:
        payload["variables"] = variables

    response = requests.post(LINEAR_API_URL, json=payload, headers=headers)

    if response.status_code != 200:
        print(f"❌ API Error: {response.status_code}")
        print(response.text)
        return None

    result = response.json()

    if "errors" in result:
        print(f"❌ GraphQL Error: {result['errors']}")
        return None

    return result.get("data")


def get_teams():
    """Fetch all teams in the workspace"""
    query = """
    query {
      teams {
        nodes {
          id
          name
          key
        }
      }
    }
    """

    data = graphql_request(query)
    if data:
        return data["teams"]["nodes"]
    return []


def get_projects(team_id):
    """Fetch all projects - will show all, you find yours by name"""
    query = """
    query {
      projects {
        nodes {
          id
          name
          state
        }
      }
    }
    """

    data = graphql_request(query)
    if data:
        return data["projects"]["nodes"]
    return []


def get_label_ids(label_names, team_id):
    """Get label IDs from label names"""
    # FIXED: Changed $teamId type from String! to ID!
    query = """
    query($teamId: ID!) {
      issueLabels(filter: { team: { id: { eq: $teamId } } }) {
        nodes {
          id
          name
        }
      }
    }
    """

    data = graphql_request(query, {"teamId": team_id})
    if not data:
        return []

    # Create a mapping of label names to IDs
    label_map = {label["name"]: label["id"] for label in data["issueLabels"]["nodes"]}

    # Get IDs for requested labels
    label_ids = []
    for name in label_names:
        if name in label_map:
            label_ids.append(label_map[name])
        else:
            print(f"⚠️  Warning: Label '{name}' not found, skipping")

    return label_ids


def create_issue(title, description, team_id, project_id, labels, estimate, priority, parent_id=None):
    """Create an issue in Linear"""

    # Map priority text to Linear's priority numbers (0-4)
    priority_map = {
        "Urgent": 1,
        "High": 2,
        "Medium": 3,
        "Low": 4,
        "None": 0
    }
    priority_num = priority_map.get(priority, 0)

    # Get label IDs
    label_names = [l.strip() for l in labels.split(",") if l.strip()]
    label_ids = get_label_ids(label_names, team_id)

    # Build the mutation
    mutation = """
    mutation($input: IssueCreateInput!) {
      issueCreate(input: $input) {
        success
        issue {
          id
          identifier
          title
        }
      }
    }
    """

    variables = {
        "input": {
            "teamId": team_id,
            "title": title,
            "description": description,
            "priority": priority_num,
            "labelIds": label_ids,
        }
    }

    # Add optional fields
    if project_id:
        variables["input"]["projectId"] = project_id

    # FIXED: Convert estimate to integer (Linear only accepts whole numbers)
    if estimate:
        try:
            variables["input"]["estimate"] = int(float(estimate))
        except ValueError:
            print(f"⚠️  Warning: Invalid estimate value '{estimate}', skipping")

    if parent_id:
        variables["input"]["parentId"] = parent_id

    data = graphql_request(mutation, variables)

    if data and data.get("issueCreate", {}).get("success"):
        issue = data["issueCreate"]["issue"]
        print(f"✅ Created: {issue['identifier']} - {issue['title']}")
        return issue["id"]
    else:
        print(f"❌ Failed to create: {title}")
        return None


# ============================================================================
# MAIN IMPORT LOGIC
# ============================================================================

def main():
    print("=" * 70)
    print("LINEAR CSV IMPORTER - FIXED VERSION")
    print("=" * 70)
    print()

    # Validate API key
    if LINEAR_API_KEY == "YOUR_API_KEY_HERE":
        print("❌ Please set your LINEAR_API_KEY in the script")
        print("   Get it from: Linear → Settings → Account → API")
        return

    # Fetch and display teams
    print("Fetching your teams...")
    teams = get_teams()
    if not teams:
        print("❌ Could not fetch teams. Check your API key.")
        return

    print("\nYour teams:")
    for team in teams:
        print(f"  • {team['name']} (Key: {team['key']}, ID: {team['id']})")
    print()

    # Validate team ID
    if TEAM_ID == "YOUR_TEAM_ID_HERE":
        print("❌ Please set your TEAM_ID in the script")
        print("   Copy one of the IDs above")
        return

    # Fetch and display projects
    print(f"Fetching all projects...")
    projects = get_projects(TEAM_ID)
    if projects:
        print("\nYour projects:")
        for project in projects:
            print(f"  • {project['name']} (ID: {project['id']}, State: {project['state']})")
        print()

    # Validate project ID
    if PROJECT_ID == "YOUR_PROJECT_ID_HERE":
        print("❌ Please set your PROJECT_ID in the script")
        if projects:
            print("   Find 'Kolb's Reflection Cycle App MVP' in the list above")
        return

    # Read CSV and import
    print("=" * 70)
    print("IMPORTING TICKETS")
    print("=" * 70)
    print()

    try:
        with open(CSV_FILE, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)

            # Store parent issue IDs for subtask linking
            parent_map = {}

            for row in reader:
                title = row.get("Title", "")
                description = row.get("Description", "")
                parent_title = row.get("Parent", "")
                ticket_type = row.get("Type", "")
                labels = row.get("Labels", "")
                estimate = row.get("Estimate", "")
                priority = row.get("Priority", "Medium")

                # Add acceptance criteria to description if present
                acceptance = row.get("Acceptance Criteria", "")
                if acceptance:
                    description += f"\n\n## Acceptance Criteria\n{acceptance}"

                # Determine parent ID for subtasks
                parent_id = None
                if parent_title and parent_title in parent_map:
                    parent_id = parent_map[parent_title]

                # Create the issue
                issue_id = create_issue(
                    title=title,
                    description=description,
                    team_id=TEAM_ID,
                    project_id=PROJECT_ID,
                    labels=labels,
                    estimate=estimate,
                    priority=priority,
                    parent_id=parent_id
                )

                # Store parent issues for subtask linking
                if ticket_type == "Epic" and issue_id:
                    parent_map[title] = issue_id

                # Rate limiting - be nice to the API
                time.sleep(0.5)

        print()
        print("=" * 70)
        print("✅ IMPORT COMPLETE!")
        print("=" * 70)
        print()
        print("Check Linear to see your imported tickets.")

    except FileNotFoundError:
        print(f"❌ Error: Could not find '{CSV_FILE}'")
        print("   Make sure the CSV file is in the same directory as this script")
    except Exception as e:
        print(f"❌ Error during import: {e}")


if __name__ == "__main__":
    main()
