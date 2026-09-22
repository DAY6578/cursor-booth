# Creates arasuka-tools labels on the private repo.
# Run from the repo root after: gh auth login
$ErrorActionPreference = "Stop"
$repo = gh repo view --json nameWithOwner --jq .nameWithOwner
if (-not $repo) { throw "GitHub repo is not connected. Push this folder first." }

$labels = @(
  @{ name = "bug";          color = "d73a4a"; description = "不具合" },
  @{ name = "feature";      color = "0e8a16"; description = "機能追加・改善" },
  @{ name = "support";      color = "0075ca"; description = "問い合わせ。実装しない" },
  @{ name = "growth";       color = "fbca04"; description = "店長への提案。実装しない" },
  @{ name = "release";      color = "5319e7"; description = "QA PASS後の公開準備" },
  @{ name = "P0";           color = "b60205"; description = "最優先" },
  @{ name = "P1";           color = "d93f0b"; description = "次にやる" },
  @{ name = "P2";           color = "c5def5"; description = "余力があれば" },
  @{ name = "cursor-ready"; color = "1d76db"; description = "Cursorが実装してよい" },
  @{ name = "qa-ready";     color = "bfdadc"; description = "QA Botが検品してよい" },
  @{ name = "approved";     color = "006b75"; description = "オーナーが公開を承認した" }
)

foreach ($label in $labels) {
  gh label create $label.name --repo $repo --color $label.color --description $label.description --force | Out-Null
  Write-Host "label $($label.name)"
}
