set -ex

export REACT_APP_VERSION=$(git rev-list HEAD --count)
export REACT_APP_COMMIT_ID=$(git rev-parse HEAD)
export REACT_APP_COMMIT_ID_SHORT=$(git rev-parse --short HEAD)

$*