// public/js/admin.js
// Small progressive enhancements for the admin area. Everything also works
// without JavaScript.
(function () {
    'use strict';

    // Status dropdowns submit as soon as they change.
    document.querySelectorAll('select[data-autosubmit]').forEach(function (select) {
        select.addEventListener('change', function () {
            if (select.form) select.form.submit();
        });
    });
})();
