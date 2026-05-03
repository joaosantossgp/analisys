# Product Page UI/UX Prompts

This document contains copy-ready prompts for Claude Design or another UI agent.
Each prompt describes what the screen must contain and how users should interact
with it. The prompts focus on product content, expected behavior, and required
states instead of vague visual direction.

## Auth Modals

**Current status:** The login popup and create account popup already exist. Do
not generate new versions of these modals unless the task is explicitly about
redesigning authentication.

**Use this prompt only when another page needs to connect with auth:**

```text
Use the existing login and create account pop-up modals. Do not recreate them.

When authentication is required, the page should:
- Open the existing login popup
- Let users switch to the existing create account popup
- Return users to the page action they were trying to complete after login
- Show a clear signed-out state when the action is blocked
- Preserve the current page context after authentication

States to include:
- Signed out
- Login popup open
- Create account popup open
- Authentication loading
- Authentication failed
- Authentication completed and returned to the original page action

Context:
The authentication modals are already created for this premium financial analytics platform. New page designs should integrate with the existing auth flow instead of duplicating it.
```

## Dashboard

**Page purpose:** Give users a fast entry point into company analysis, saved work,
recent activity, and platform status.

**Required content/components:**
- Global search by company, ticker, or CVM code
- Recent companies
- Saved analyses
- Latest filings
- Shortcut actions for compare, sectors, and update base
- Alert summary
- Data freshness or system status summary

**Important user actions:**
- Search for a company
- Open a recent company
- Resume saved work
- Review latest filings
- Navigate to key workflows

**States to include:**
- First-time empty state
- Loading data
- No recent companies
- No saved views
- Search with results
- Search with no results
- Partial data unavailable

```text
Create a dashboard page for a premium financial analytics platform.

The page should include:
- Search by company name, ticker, or CVM code
- Recent companies
- Saved analyses and comparisons
- Latest imported filings
- Shortcuts to company search, compare, sectors, and update base
- Alert summary for filings, KPI thresholds, and update jobs
- Data freshness or platform status summary

Main user actions:
- Search and open a company
- Resume a saved analysis
- Open a recent company
- Review recent filings
- Jump into compare, sectors, or update base workflows

States to include:
- Loading dashboard data
- First-time user with no activity
- No recent companies
- No saved views
- Search results
- Search with no results
- Partial data unavailable without blocking the whole page

Context:
This screen is used by professionals analyzing companies, CVM filings, financial indicators, sectors, and comparisons. Keep the experience focused, trustworthy, efficient, and suitable for a serious financial product.
```

## Company Search

**Page purpose:** Help users find companies by name, ticker, CVM code, or sector.

**Required content/components:**
- Search input
- Filters for sector and company status
- Company result list
- Recent searches
- Result count
- Pagination or load more
- Clear filters action

**Important user actions:**
- Search companies
- Filter results
- Open company detail
- Clear search and filters
- Reuse a recent search

**States to include:**
- Loading results
- Empty search
- No matches
- API error
- Filtered results
- Recently searched companies

```text
Create a company search page for a premium financial analytics platform.

The page should include:
- Search by company name, ticker, or CVM code
- Filters for sector and company status
- Company result list with key identifiers
- Recent searches
- Result count
- Pagination or load more behavior
- Clear filters action

Main user actions:
- Search for a company
- Filter by sector or status
- Open a company profile or analysis page
- Clear filters
- Reopen a recent search

States to include:
- Empty search state
- Loading results
- Search results
- No matching companies
- API error
- Filters applied

Context:
This screen is used by professionals analyzing companies, CVM filings, financial indicators, sectors, and comparisons. Keep the experience focused, trustworthy, efficient, and suitable for a serious financial product.
```

## Company Profile

**Page purpose:** Present the identity, metadata, available data, and next actions
for one company.

**Required content/components:**
- Company name, ticker, and CVM code
- Sector and classification
- Registration or listing details
- Available years and filings
- Data freshness status
- Links to analysis, statements, compare, and export
- Refresh/request update action

**Important user actions:**
- Review company identity and data availability
- Open the analysis view
- Open statements
- Add company to comparison
- Request data refresh
- Export available company data

**States to include:**
- Loading company
- Company found
- Company not found
- Missing data
- Refresh available
- Refresh in progress
- Refresh failed

```text
Create a company profile page for a premium financial analytics platform.

The page should include:
- Company name, ticker, and CVM code
- Sector and classification
- Registration or listing details
- Available years and filings
- Data freshness status
- Entry points to analysis, statements, compare, and export
- Refresh or request update action

Main user actions:
- Review company identity and available data
- Open the analysis screen
- Open financial statements
- Add the company to a comparison
- Request a data refresh
- Export company data

States to include:
- Loading company data
- Company found
- Company not found
- Company exists with missing filings
- Refresh available
- Refresh in progress
- Refresh failed

Context:
This screen is used by professionals analyzing companies, CVM filings, financial indicators, sectors, and comparisons. Keep the experience focused, trustworthy, efficient, and suitable for a serious financial product.
```

## Company Analysis

**Page purpose:** Let users analyze one company's financial indicators and
statements across selected periods.

**Required content/components:**
- Company header
- Period selector
- Indicator selection
- KPI chart area
- Annual or quarterly view
- Financial statement table access
- Contextual help for indicators and periods
- Export and compare actions

**Important user actions:**
- Select periods
- Choose indicators
- Switch between overview and statements
- Read charts and tables
- Export data
- Add company to comparison

**States to include:**
- Loading indicators
- No indicators for selected period
- Missing statement data
- Period selection changed
- Export loading
- Refresh needed

```text
Create a company analysis page for a premium financial analytics platform.

The page should include:
- Company header with identity and data freshness
- Period selector
- Indicator selection
- KPI chart area
- Annual and quarterly analysis options
- Financial statement table access
- Contextual help for indicators, periods, and calculations
- Export and compare actions

Main user actions:
- Select periods
- Choose which indicators appear in the chart
- Switch between overview and financial statements
- Read KPIs, charts, and tables
- Export data
- Add the company to a comparison

States to include:
- Loading indicators
- No indicators for the selected period
- Missing statement data
- Period selection changed
- Export loading
- Refresh needed or refresh in progress

Context:
This screen is used by professionals analyzing companies, CVM filings, financial indicators, sectors, and comparisons. Keep the experience focused, trustworthy, efficient, and suitable for a serious financial product.
```

## Compare Companies

**Page purpose:** Let users compare financial indicators and statements across
multiple companies using aligned periods.

**Required content/components:**
- Company selector
- Selected company list
- Common period selector
- KPI comparison table
- Side-by-side chart area
- Missing data indicators
- Export/share actions

**Important user actions:**
- Select two or more companies
- Remove or replace companies
- Align periods
- Compare KPIs and statements
- Export comparison
- Share or save comparison

**States to include:**
- Empty comparison
- One company selected
- Minimum company requirement
- Loading comparison
- Missing common periods
- Partial data missing
- Export loading

```text
Create a compare companies page for a premium financial analytics platform.

The page should include:
- Company selector
- Selected company list
- Common period selector
- KPI comparison table
- Side-by-side chart area
- Missing data indicators
- Export, share, and save actions

Main user actions:
- Select two or more companies
- Remove or replace companies
- Align comparison periods
- Compare KPIs and financial statements
- Export the comparison
- Save or share the comparison

States to include:
- Empty comparison
- Only one company selected
- Loading comparison data
- No common periods available
- Partial data missing for one company
- Export loading

Context:
This screen is used by professionals analyzing companies, CVM filings, financial indicators, sectors, and comparisons. Keep the experience focused, trustworthy, efficient, and suitable for a serious financial product.
```

## Sectors

**Page purpose:** Help users explore sectors, benchmark companies, and identify
sector-level patterns.

**Required content/components:**
- Sector list or directory
- Sector search/filter
- Company counts by sector
- Sector benchmark indicators
- Ranking tables
- Link to sector detail
- Link to compare companies inside a sector

**Important user actions:**
- Browse sectors
- Search for a sector
- Open sector detail
- Review benchmark indicators
- Open a ranked company
- Compare companies from the same sector

**States to include:**
- Loading sectors
- No sectors available
- Sector selected
- Ranking unavailable
- Partial benchmark data missing

```text
Create a sectors page for a premium financial analytics platform.

The page should include:
- Sector directory
- Sector search or filter
- Company counts by sector
- Sector benchmark indicators
- Ranking tables
- Link to sector detail
- Action to compare companies within a sector

Main user actions:
- Browse sectors
- Search for a sector
- Open sector detail
- Review benchmark indicators
- Open a ranked company
- Start a comparison from selected sector companies

States to include:
- Loading sectors
- No sectors available
- Sector selected
- Ranking unavailable
- Partial benchmark data missing

Context:
This screen is used by professionals analyzing companies, CVM filings, financial indicators, sectors, and comparisons. Keep the experience focused, trustworthy, efficient, and suitable for a serious financial product.
```

## Reports / Filings

**Page purpose:** Give users direct access to financial statements, filing history,
source links, and import status.

**Required content/components:**
- Filing type selector for DRE, BPA, BPP, and DFC
- Company and period context
- Filing history
- Statement table preview
- Source/download links
- Import status
- Last updated timestamp

**Important user actions:**
- Select statement type
- Select year or period
- Open filing details
- Download source files or exported data
- Review import status
- Retry or request refresh when data is missing

**States to include:**
- Loading filings
- No filings found
- Statement loaded
- Source unavailable
- Import pending
- Import failed
- Refresh requested

```text
Create a reports and filings page for a premium financial analytics platform.

The page should include:
- Filing type selector for DRE, BPA, BPP, and DFC
- Company and period context
- Filing history
- Statement table preview
- Source and download links
- Import status
- Last updated timestamp

Main user actions:
- Select statement type
- Select year or period
- Open filing details
- Download source files or exported data
- Review import status
- Retry or request refresh when data is missing

States to include:
- Loading filings
- No filings found
- Statement loaded
- Source unavailable
- Import pending
- Import failed
- Refresh requested

Context:
This screen is used by professionals analyzing companies, CVM filings, financial indicators, sectors, and comparisons. Keep the experience focused, trustworthy, efficient, and suitable for a serious financial product.
```

## Update Base

**Page purpose:** Let administrators mass populate or update the enterprise base
with clear progress, logs, and failure handling.

**Required content/components:**
- Source selector
- Year and period selection
- Company scope or filters
- Start update action
- Confirmation step
- Progress tracker
- Logs
- Error summary
- Retry failed items
- Job history

**Important user actions:**
- Choose update source
- Select years or periods
- Choose company scope
- Start update job
- Monitor progress
- Review logs
- Retry failures
- Open previous jobs

**States to include:**
- Ready to start
- Missing required selection
- Confirmation pending
- Job running
- Job completed
- Job completed with errors
- Job failed
- Source unavailable
- Permission denied

```text
Create an update base page for a premium financial analytics platform.

The page should include:
- Source selector
- Year and period selection
- Company scope or filters
- Start update action
- Confirmation step before running the job
- Progress tracker
- Live or recent logs
- Error summary
- Retry failed items action
- Job history

Main user actions:
- Choose the update source
- Select years or periods
- Choose which companies should be updated
- Start the update job
- Monitor progress
- Review logs and errors
- Retry failed items
- Open previous update jobs

States to include:
- Ready to start
- Missing required selection
- Confirmation pending
- Job running
- Job completed
- Job completed with errors
- Job failed
- Source unavailable
- Permission denied

Context:
This screen is used by administrators maintaining the company data base used for CVM filings, financial indicators, sectors, and comparisons. Keep the experience focused, trustworthy, efficient, and suitable for a serious financial product.
```

## Saved Views

**Page purpose:** Let users find, reopen, manage, and share saved analysis work.

**Required content/components:**
- Saved dashboards
- Saved company analyses
- Saved comparisons
- Saved indicator sets
- Search/filter for saved items
- Rename, delete, duplicate, share actions
- Last updated metadata

**Important user actions:**
- Open saved view
- Search saved views
- Rename a saved item
- Delete a saved item
- Duplicate a saved item
- Share a saved item

**States to include:**
- Loading saved views
- No saved views
- Filter with no matches
- Delete confirmation
- Rename editing
- Share success
- Share error

```text
Create a saved views page for a premium financial analytics platform.

The page should include:
- Saved dashboards
- Saved company analyses
- Saved comparisons
- Saved indicator sets
- Search and filters for saved items
- Rename, delete, duplicate, and share actions
- Last updated metadata

Main user actions:
- Open a saved view
- Search saved views
- Rename a saved item
- Delete a saved item
- Duplicate a saved item
- Share a saved item

States to include:
- Loading saved views
- No saved views
- Filter with no matches
- Delete confirmation
- Rename editing
- Share success
- Share error

Context:
This screen is used by professionals analyzing companies, CVM filings, financial indicators, sectors, and comparisons. Keep the experience focused, trustworthy, efficient, and suitable for a serious financial product.
```

## Alerts

**Page purpose:** Let users monitor filing updates, KPI thresholds, and update job
notifications.

**Required content/components:**
- Alert list
- Alert categories
- Read/unread status
- Filing alerts
- KPI threshold alerts
- Update completion alerts
- Alert settings shortcut
- Mark as read action

**Important user actions:**
- Read alert details
- Filter alerts by type
- Mark alerts as read
- Open related company, filing, or job
- Change alert settings

**States to include:**
- Loading alerts
- No alerts
- Unread alerts
- All read
- Filter with no matches
- Alert action failed

```text
Create an alerts page for a premium financial analytics platform.

The page should include:
- Alert list
- Alert categories
- Read and unread status
- Filing alerts
- KPI threshold alerts
- Update completion alerts
- Shortcut to alert settings
- Mark as read action

Main user actions:
- Read alert details
- Filter alerts by type
- Mark alerts as read
- Open the related company, filing, or update job
- Change alert settings

States to include:
- Loading alerts
- No alerts
- Unread alerts
- All alerts read
- Filter with no matches
- Alert action failed

Context:
This screen is used by professionals analyzing companies, CVM filings, financial indicators, sectors, and comparisons. Keep the experience focused, trustworthy, efficient, and suitable for a serious financial product.
```

## Settings

**Page purpose:** Let users control account preferences, data defaults, exports,
theme, and notifications.

**Required content/components:**
- Account profile section
- Theme preference
- Default period preference
- Data display preferences
- Export format preference
- Notification settings
- Security/account actions
- Save changes action

**Important user actions:**
- Update profile details
- Change theme
- Set default period
- Adjust data display options
- Choose export format
- Configure notifications
- Save changes

**States to include:**
- Loading settings
- Unsaved changes
- Saving
- Save success
- Save error
- Invalid input

```text
Create a settings page for a premium financial analytics platform.

The page should include:
- Account profile section
- Theme preference
- Default period preference
- Data display preferences
- Export format preference
- Notification settings
- Security and account actions
- Save changes action

Main user actions:
- Update profile details
- Change theme
- Set the default period
- Adjust data display options
- Choose export format
- Configure notifications
- Save changes

States to include:
- Loading settings
- Unsaved changes
- Saving changes
- Save success
- Save error
- Invalid input

Context:
This screen is used by professionals analyzing companies, CVM filings, financial indicators, sectors, and comparisons. Keep the experience focused, trustworthy, efficient, and suitable for a serious financial product.
```

## Admin

**Page purpose:** Let administrators manage users, data jobs, data source health,
system logs, and permissions.

**Required content/components:**
- User management
- Role and permission overview
- Update job history
- Data source health
- System logs
- Access control actions
- Audit-friendly timestamps
- Error and warning summaries

**Important user actions:**
- Search and manage users
- Change roles or permissions
- Review update jobs
- Check source health
- Inspect system logs
- Resolve warnings or failed jobs

**States to include:**
- Loading admin data
- Permission denied
- No users found
- Job history empty
- Source healthy
- Source degraded
- Source unavailable
- Action success
- Action failed

```text
Create an admin page for a premium financial analytics platform.

The page should include:
- User management
- Role and permission overview
- Update job history
- Data source health
- System logs
- Access control actions
- Audit-friendly timestamps
- Error and warning summaries

Main user actions:
- Search and manage users
- Change roles or permissions
- Review update jobs
- Check data source health
- Inspect system logs
- Resolve warnings or failed jobs

States to include:
- Loading admin data
- Permission denied
- No users found
- Job history empty
- Source healthy
- Source degraded
- Source unavailable
- Action success
- Action failed

Context:
This screen is used by administrators responsible for user access, data quality, CVM filing imports, update jobs, and platform reliability. Keep the experience focused, trustworthy, efficient, and suitable for a serious financial product.
```
