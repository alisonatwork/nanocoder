---
"@nanocollective/nanocoder": patch
---

Restore Shift+Enter / Alt+Enter as a newline in terminals that send xterm's modifyOtherKeys encoding (including the VS Code integrated terminal): the input stream now rewrites those sequences into the kitty CSI-u form that Ink 8 parses natively.
