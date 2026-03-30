# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - alert [ref=e2]
  - generic [ref=e3]:
    - link "AKAI" [ref=e4] [cursor=pointer]:
      - /url: /
      - generic [ref=e5]: AKAI
    - generic [ref=e6]:
      - generic [ref=e7]:
        - button "Sign In" [ref=e8] [cursor=pointer]
        - button "Create Account" [ref=e9] [cursor=pointer]
      - heading "Welcome back" [level=1] [ref=e10]
      - paragraph [ref=e11]: Sign in to your AKAI workspace.
      - button "Continue with Google" [ref=e12] [cursor=pointer]:
        - img [ref=e13]
        - text: Continue with Google
      - button "Continue with Microsoft" [ref=e18] [cursor=pointer]:
        - img [ref=e19]
        - text: Continue with Microsoft
      - generic [ref=e26]: or
      - generic [ref=e28]:
        - generic [ref=e29]:
          - generic [ref=e30]: Email
          - textbox "you@example.com" [ref=e31]
        - generic [ref=e32]:
          - generic [ref=e33]:
            - generic [ref=e34]: Password
            - button "Forgot password?" [ref=e35] [cursor=pointer]
          - textbox "••••••••" [ref=e36]
        - button "Sign In →" [ref=e37] [cursor=pointer]
      - paragraph [ref=e38]:
        - text: Don't have an account?
        - button "Create one" [ref=e39] [cursor=pointer]
```