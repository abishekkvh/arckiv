# Web Technology syllabus demonstration

Open `/project-guide` for the interactive navigation checklist. These are implemented uses, not a claim that every syllabus topic is covered.

| Unit | Implemented topics | Evidence / demonstration |
| --- | --- | --- |
| I — HTML5 | Forms; email/password/search inputs and autocomplete; lists/datalist; tables; semantic structure; internal linking; metadata | `EmailAuthForm.jsx`, `DocumentSummaryModal.jsx`, `Admin.jsx`, `ProjectGuide.jsx`, `index.html`. Open a Summary, filter tags, inspect suggestions; view admin tables. |
| II — CSS3 | External styles; box model; positioning; dropdown menus; responsive and print media queries; rounded corners and shadows | `index.css`, `DocumentCard.jsx`, `Navigation.jsx`. Resize the page, open document options, use print preview and reduced-motion preference. |
| III — JavaScript / DOM | Functions/objects/arrays/control flow; submit/reset/focus/blur/input handling; bubbling; native DOM dialog; timers/dynamic effects | `EmailAuthForm.jsx`, `DocumentSummaryModal.jsx`, `Navigation.jsx`, `Admin.jsx`. Submit/clear form, filter tags, dismiss dialog with Escape, search with debounce. |
| IV — jQuery | Fundamentals/selectors; wrapped-set iteration; attribute manipulation; CSS class changes; content updates; form values | Summary filter uses `find`, `each`, `on/off`, `attr/removeAttr`, `toggleClass`, `text`, `val`. Scoped namespaced events are cleaned up when the dialog closes. |

## Features

- Email/password registration, login and password reset use Firebase; passwords never reach Express or MongoDB.
- Admin is restricted by verified Firebase identity plus an Admin SDK custom claim and the owner's email. Other users receive HTTP 403 from the server, even if they manually open `/admin`.
- Saved V2 evaluation metrics and confusion matrix are labelled as offline report results, separate from live model health and classification counts. No retraining or threshold changes.
- Summary displays saved upload metadata without another AI call. Missing summaries and empty tags have explicit empty states.
- Format counts include PDF, photos/images, DOCX and Other, including zeros. A DOCX count does not imply DOCX upload support; existing upload MIME restrictions remain in force.
- Entrance/hover/dropdown transitions respect reduced-motion preferences.

## jQuery distribution

Version 3.7.1, downloaded from https://code.jquery.com/jquery-3.7.1.min.js, locally served under `client/public/vendor`, license notice retained. SHA-256 integrity: `/JqT3SQfawRcv/BIHPThkBvs0OEvtFFmqPF/lYI/Cxo=`. This avoids a runtime CDN dependency. Official API references: https://api.jquery.com/ .
