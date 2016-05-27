# SnapMobile-AdminServer
A npm module for a server-side admin server

# Usage

Include this private module by adding the following under `dependencies` in `package.json`, and run `npm install`.

    "snapmobile-auth": "git+https://1e8b0a2166919016f0b18bdf4017d107dedb29af:x-oauth-basic@github.com/SnapMobileIO/SnapMobile-AdminServer.git",

To configure, add the following to `routes.js`:

```
import User from '../app/user/user.model';
...
var admin = require('snapmobile-adminserver');
var utils = require('../components/utils');
admin.setUtils(utils)
admin.setUser(User);
app.use('/api/admin', admin.router);
```

# Updating

Make any changes in `/src`.

Once changes are completed, run `gulp dist` to process JavaScript files and add to `/dist`.
