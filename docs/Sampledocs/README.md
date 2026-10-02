# Sample documents

Source documents that `docs/Domain.md` refers to are placed in this folder as each step comes up.

## Real documents stay out of git

Real documents carry personal data and never enter the repository. The root `.gitignore` ignores
everything in this folder by default, so a real document is ignored the moment it lands here. It
stays on the machine it was put on and does not travel with `git push`.

## Only `Anonymized-*` files are committed

The only files tracked in this folder are this README and files whose name starts with
`Anonymized-`, for example `Anonymized-scan-example.pdf`.

An `Anonymized-*` file is **fabricated**: every name, address, number and date in it is invented.
Blacking out or replacing a few fields of a real document is not enough, because what is left can
still identify a person. If a test or a piece of documentation needs a sample, build one from
scratch and give it the `Anonymized-` prefix.

Never rename a real document to `Anonymized-*` to get it past the ignore rule.
