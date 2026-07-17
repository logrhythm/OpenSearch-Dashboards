#!/bin/bash
if [ $# -ne 1 ] ; then
    echo 'Usage:  sh buildRpm <OSD-VERSION>'
    exit 1
fi
set -e
set -x
PACKAGE=opensearch-dashboards
GIT_VERSION=`git rev-list --branches HEAD | wc -l`
GIT_BRANCH="$1"
VERSION="$GIT_BRANCH.$GIT_VERSION"
PWD=`pwd`
sudo rm -rf ~/rpmbuild
rpmdev-setuptree
cp packaging/$PACKAGE.spec ~/rpmbuild/SPECS
rm -f $PACKAGE-$VERSION.tar.gz
tar cf ~/rpmbuild/SOURCES/$PACKAGE-$VERSION.tar -C $PWD .
rpmbuild -v -bb --define="version ${VERSION}" --define="osd_version ${GIT_BRANCH}" --target=x86_64 ~/rpmbuild/SPECS/$PACKAGE.spec
