# Signing the CLA for Kubernetes Contributions

When you submit a pull request to a Kubernetes repository, you'll need to sign the Contributor License Agreement (CLA). Here's how to do it:

## Steps to Sign the CLA

1. **Submit your pull request** to the repository.

2. **Wait for the CLA check** to run on your pull request. It will likely fail with a message like:
   ```
   ❌ - login: @7908837174 / name: Kallal Mukherjee . The commit is not authorized under a signed CLA. Please click here to be authorized.
   ```

3. **Click on the "click here" link** in the CLA check message. This will take you to the Linux Foundation EasyCLA system.

4. **Sign in with your GitHub account** if prompted.

5. **Choose the appropriate CLA signing option**:
   - **Individual CLA**: If you're contributing as an individual
   - **Corporate CLA**: If you're contributing on behalf of your employer

6. **Follow the instructions** to complete the signing process:
   - For Individual CLA: Fill out your personal information and sign electronically
   - For Corporate CLA: You'll need to have your company's CLA manager approve your request

7. **Wait for confirmation** that your CLA has been signed.

8. **Return to your pull request**. The CLA check should automatically re-run within a few minutes.

9. If the CLA check still fails, you can manually trigger it by:
   - Adding a comment to the PR
   - Making a small change and pushing it
   - Asking a maintainer to help re-run the check

## CLA Link

If you need to access the CLA signing page directly, use this link:
https://api.easycla.lfx.linuxfoundation.org/v2/repository-provider/github/sign/20677499/220546758/3336/#/?version=2

## Troubleshooting

If you encounter issues with the CLA signing process:

1. Make sure your GitHub email matches the email you used to sign the CLA.

2. Check that you've properly configured your Git client with the same email:
   ```
   git config --global user.email "your-email@example.com"
   ```

3. If you're contributing on behalf of a company, ensure your company has a Corporate CLA on file.

4. For further assistance, submit a support request ticket through the EasyCLA system.