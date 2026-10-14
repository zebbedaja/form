# Form

A game where your goal is to fill out a form. That's it. How hard can it be?

**Play it at https://zebbedaja.github.io/form/**

Plain HTML, CSS and JavaScript with no build step. Open `index.html` directly or serve the folder.

The form has two pages. After validation, **Next** opens a second window rotated 180 degrees and permanently behind the original window, with 60% horizontal overlap. Its occupation and city fields are obscured by the first window and can be filled using the keyboard. Use **Back** to edit your details or **Submit** to finish.

## Testing

- `?debug=1` turns off all the trolls (no evasion, no shuffling, no extra dialogs) and skips the loading screen.
- The Konami code (↑ ↑ ↓ ↓ ← → ← → B A) fills in page 1. Page 2 requires the reversed sequence (A B → ← → ← ↓ ↓ ↑ ↑) and fills only its own fields.

Browser end-to-end tests require Node.js and Python 3 (for the local static server):

```sh
npm install
npx playwright install chromium
npm test
```

The tests use debug mode and the Konami code to fill the form, submit through the real dialogs, and check the personalized congratulations heading. Run `npm run test:ui` for the interactive runner. To use an installed Chrome browser instead of downloading Chromium, run `PLAYWRIGHT_CHANNEL=chrome npm test`.

### Record and watch tests

```sh
npm run test:record
npm run test:report
```

Recording mode saves videos and traces for every test, including passing tests. In the HTML report, open a test to watch its video or explore its trace. Videos are also saved as `test-results/<test-name>/video.webm`. A new test run replaces the previous results, so copy recordings elsewhere to keep them.

With installed Chrome, run `npx playwright install ffmpeg` once for video support, then use `PLAYWRIGHT_CHANNEL=chrome npm run test:record`. Add `-- --headed --workers=1` to watch the browser while it records.
