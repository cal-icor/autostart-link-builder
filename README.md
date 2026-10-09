# autostart-link-builder

Combine a [fancy-profiles](https://github.com/2i2c-org/jupyterhub-fancy-profiles) permalink with an [nbgitpuller](https://github.com/jupyterhub/nbgitpuller) link into one link that logs in, starts the server with those settings, and pulls the repository.

https://cal-icor.github.io/autostart-link-builder/

Requires fancy-profiles 0.7.0 or newer on the hub. The logic is in `builder.js`; `node test.js` runs the tests.
