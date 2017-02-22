# todo
additional syntax for functional macros:
* @macro(args) as sugar for @{macro(args)}

maybe also for value macros?
* @macro -> @{macro}
* but what about following characters? spaces?
* xxx@macro xxx OK, but xxx@macroxxx NOK?
* or just always require {} in case of value macros

async macros:
* returning promises
* accepting a callback
* onResolve, like React Router?

simpleScript macro:
* see core-macros.js

merge @grab & @take
* perhaps @take will be a preparametrized version of @grab and @grab will be a very general macro
