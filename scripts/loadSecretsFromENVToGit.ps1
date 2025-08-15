$REPO = "mathursrus/Ashley-Calendar-AI"
Get-Content ..\.env | ForEach-Object {
  if ($_ -match '^\s*$' -or $_ -match '^\s*#') { return }
  $parts = $_.Split('=',2)
  $key = $parts[0].Trim()
  $val = $parts[1].Trim('"').Trim("'")
  gh secret set $key --repo $REPO -b $val
}
