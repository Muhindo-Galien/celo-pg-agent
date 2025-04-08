import pandas as pd
import sys

# Choose format based on command line argument or default to new format
# Usage: python create_sample_data.py [legacy|new]
format_type = "new"
if len(sys.argv) > 1 and sys.argv[1].lower() == "legacy":
    format_type = "legacy"

if format_type == "legacy":
    # Legacy format with all columns
    sample_data = [
        {
            "project_name": "Celo Composer",
            "project_description": "celo-composer is a starter project with all code needed to build, deploy, and upgrade a dapps on Celo.",
            "project_github_url": "https://github.com/celo-org/celo-composer",
            "project_owner_github_url": ["https://github.com/viral-sangani"],
            "project_url": "NA",
        }
    ]
    output_file = "sample_projects_legacy.xlsx"
else:
    # New format with only Name, Github URL, Description
    sample_data = [
        {
            "Name": "sovseas",
            "Github URL": "https://github.com/Olisehgenesis/sovereign-seas",
            "Description": "Sovereign Seas is a revolutionary decentralized application built on the Celo blockchain that empowers communities to collectively fund innovative projects through transparent, democratic voting. Our platform creates an ecosystem where the best ideas rise to the surface through the power of community decision-making."
        },
         {
            "Name": "Celo Composer",
            "Github URL": "https://github.com/Olisehgenesis/sovereign-seas",
            "Description": "celo-composer is a starter project with all code needed to build, deploy, and upgrade a dapps on Celo."
        }
    ]
    output_file = "sample_projects.xlsx"

# Create DataFrame
df = pd.DataFrame(sample_data)

# Save to Excel
df.to_excel(output_file, index=False)

print(f"Sample data created in {format_type} format and saved to '{output_file}'")
