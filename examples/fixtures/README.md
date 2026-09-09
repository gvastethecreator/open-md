# Format test fixtures

Use these samples to check format-specific controls and status without OS associations. For complete example documents, see the [Lumen Harbor pack](../README.md). Native tests open `sample-scene.nfo` by path.

| File | Expect |
| --- | --- |
| `sample-config.json` | Rich JSON Read; Edit opens property rows; status shows keys |
| `sample-table.csv` | Table Read; status shows rows×cols |
| `sample-swatch.png` | Image Read; context menu Copy/Download/Fit/Actual size; status W×H |
| `sample-scene.nfo` | CP437 scene art for the decoder. Status NFO. Read/Source only. Boxes join. |
| `sample-nfo-utf8.nfo` | Unicode program readme (copy of `../lumen-station.nfo`). Same NFO surface. |
| `sample-nfo-xml.nfo` | Kodi movie XML. Ordinary Text. Edit available. |
| `sample-nfo-lt-art.nfo` | Starts with `<` but is not XML. Stays NFO. |
| `sample-app.log` | Log Read/Source. No Edit. |

Showcase Unicode program NFO, Kodi XML, and Windows MsInfo XML live one
directory up: `lumen-station.nfo`, `kodi-the-quiet-place.nfo`,
`kodi-harbor-nights.nfo`, `windows-msinfo.nfo`.

Open via drop, CLI path, or Open with (not the Markdown picker filter).
