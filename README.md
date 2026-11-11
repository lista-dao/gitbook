# Lista DAO Documentation

The published documentation lives on the content branches, not here.

| Branch | Content |
| --- | --- |
| [`en`](../../tree/en) | English documentation (published) |
| [`zh-CN`](../../tree/zh-CN) | Chinese translation (published) |

`main` exists because GitHub Actions runs scheduled (cron) workflows only from
the repository's default branch. The three watchers under `.github/workflows/`
check out `en`, refresh the generated pages, and open a pull request against it.
