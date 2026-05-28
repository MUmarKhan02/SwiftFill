# SwiftFill

A Chrome extension that autofills job application forms on Workday, Greenhouse, and other job sites.

## Features

- Fills personal info, address, and social links on application forms
- Separate modes for Application, Sign Up, and Log In
- Switch between full-time and part-time email
- Switch between standard and strong password
- Reports which fields were filled and which were skipped

## Setup

1. Clone the repo
2. Copy `profile.example.json` to `profile.json` and fill in your details
3. Go to `chrome://extensions` in Chrome
4. Enable **Developer mode** (top right)
5. Click **Load unpacked** and select the project folder
6. Pin the extension to your toolbar

## Usage

Navigate to any job application page, click the SwiftFill icon, pick your mode and hit **Fill Fields**.

## Note

`profile.json` is gitignored — never commit it. Your personal info stays local.
