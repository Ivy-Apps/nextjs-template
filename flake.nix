{
  description = "Next.js starter template";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    { nixpkgs, flake-utils, ... }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        devShells.default = pkgs.mkShell {
          packages = [
            pkgs.nodejs_24
            pkgs.pnpm_12
            pkgs.just
          ];

          # Playwright uses the browsers nixpkgs builds; @playwright/test in
          # package.json is pinned to pkgs.playwright-driver.version.
          PLAYWRIGHT_BROWSERS_PATH = pkgs.playwright-driver.browsers.override {
            withFirefox = false;
            withWebkit = false;
          };
          PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1";
          PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS = "true";
          PLAYWRIGHT_DRIVER_VERSION = pkgs.playwright-driver.version;
        };
      }
    );
}
