# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - alert [ref=e2]
  - iframe [ref=e3]:
    
  - generic [ref=e4]:
    - link "AKAI" [ref=e5]:
      - /url: /
      - generic [ref=e6]: AKAI
    - generic [ref=e7]:
      - generic [ref=e8]:
        - button "Sign In" [ref=e9] [cursor=pointer]
        - button "Create Account" [ref=e10] [cursor=pointer]
      - heading "Welcome back" [level=1] [ref=e11]
      - paragraph [ref=e12]: Sign in to your AKAI workspace.
      - button "Continue with Google" [ref=e13] [cursor=pointer]:
        - img [ref=e14]
        - text: Continue with Google
      - button "Continue with Microsoft" [ref=e19] [cursor=pointer]:
        - img [ref=e20]
        - text: Continue with Microsoft
      - generic [ref=e27]: or
      - generic [ref=e29]:
        - generic [ref=e30]:
          - generic [ref=e31]: Email
          - textbox "you@example.com" [ref=e32]
        - generic [ref=e33]:
          - generic [ref=e34]:
            - generic [ref=e35]: Password
            - button "Forgot password?" [ref=e36] [cursor=pointer]
          - textbox "••••••••" [ref=e37]
        - button "Sign In →" [ref=e38] [cursor=pointer]
      - paragraph [ref=e39]:
        - text: Don't have an account?
        - button "Create one" [ref=e40] [cursor=pointer]
```