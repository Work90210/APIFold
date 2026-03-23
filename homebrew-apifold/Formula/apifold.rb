class Apifold < Formula
  desc "Turn any OpenAPI spec into a running MCP server"
  homepage "https://github.com/kylefuhri/apifold"
  license "AGPL-3.0-or-later"

  # Binary releases are published to GitHub Releases on cli-v* tags.
  # Update the URL and sha256 when cutting a new release.
  on_macos do
    on_arm do
      url "https://github.com/kylefuhri/apifold/releases/download/cli-v#{version}/apifold-darwin-arm64"
      sha256 "PLACEHOLDER"

      def install
        bin.install "apifold-darwin-arm64" => "apifold"
      end
    end

    on_intel do
      url "https://github.com/kylefuhri/apifold/releases/download/cli-v#{version}/apifold-darwin-x64"
      sha256 "PLACEHOLDER"

      def install
        bin.install "apifold-darwin-x64" => "apifold"
      end
    end
  end

  on_linux do
    on_arm do
      url "https://github.com/kylefuhri/apifold/releases/download/cli-v#{version}/apifold-linux-arm64"
      sha256 "PLACEHOLDER"

      def install
        bin.install "apifold-linux-arm64" => "apifold"
      end
    end

    on_intel do
      url "https://github.com/kylefuhri/apifold/releases/download/cli-v#{version}/apifold-linux-x64"
      sha256 "PLACEHOLDER"

      def install
        bin.install "apifold-linux-x64" => "apifold"
      end
    end
  end

  test do
    assert_match "apifold", shell_output("#{bin}/apifold --help")
  end
end
