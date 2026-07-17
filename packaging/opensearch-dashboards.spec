Summary:       Custom LogRhythm OpenSearch Dashboards
Name:          opensearch-dashboards
Version:       %{version}
Release:       1%{?dist}
License:       https://github.com/opensearch-project/OpenSearch-Dashboards/blob/main/LICENSE
Group:         Development/Tools
URL:           https://github.com/opensearch-project/OpenSearch-Dashboards
Source:        https://github.com/opensearch-project/OpenSearch-Dashboards
Requires:      python3, python3-requests
Requires(post): systemd
%description
OpenSearch Dashboards build for LogRhythm NetMon
%prep
cd %_builddir
rm -rf %{name}
mkdir %{name}
cd %{name}
%global __requires_exclude_from ^/usr/local/opensearch-dashboards.*/node_modules/.*$
%global __provides_exclude_from ^/usr/local/opensearch-dashboards.*/node_modules/.*$
tar xf %_sourcedir/%{name}-%{version}.tar
if [ $? -ne 0 ]; then
   exit $?
fi
# Install OSD 2.x compatible network visualization plugin
unzip resources/plugins/kbn_network*.zip -d plugins/
if [ $? -ne 0 ]; then
   echo "Exiting build. Could not unzip plugin."
   exit 1
fi
%build
cd %{name}
/usr/bin/yarn
cd plugins/opensearch-dashboards/
/usr/bin/yarn
cd ../../
/usr/bin/yarn osd bootstrap
NODE_OPTIONS="--max-old-space-size=8192" node scripts/build --rpm --skip-archives --release --verbose --allow-root
%pre
getent group nginx > /dev/null || groupadd -f -g 904 -r nginx
if ! getent passwd nginx >/dev/null ; then
    if ! getent passwd 904 >/dev/null ; then
      useradd -r -u 904 -g nginx -s /sbin/nologin -c "LogRhythm nginx" nginx
    else
      useradd -r -g nginx -s /sbin/nologin -c "LogRhythm nginx" nginx
    fi
fi
%install
cd %{name}
mkdir -p %{buildroot}/lib/systemd/system
cp systemd/opensearch-dashboards.service %{buildroot}/lib/systemd/system
mkdir -p %{buildroot}/usr/local/%{name}-%{osd_version}-linux-x64
cp -a build/%{name}-%{osd_version}-linux-x64/* %{buildroot}/usr/local/%{name}-%{osd_version}-linux-x64/
cp -a resources/ %{buildroot}/usr/local/%{name}-%{osd_version}-linux-x64/
mkdir -p %{buildroot}/usr/local/%{name}-%{osd_version}-linux-x64/data
cp node_modules/tether/dist/js/tether.min.js %{buildroot}/usr/local/%{name}-%{osd_version}-linux-x64/src/core/server/core_app/assets/ 2>/dev/null || true
mkdir -p %{buildroot}/usr/local/%{name}-%{osd_version}-linux-x64/scripts
cp scripts/exportAssets.py %{buildroot}/usr/local/%{name}-%{osd_version}-linux-x64/scripts
cp scripts/configureOSD.py %{buildroot}/usr/local/%{name}-%{osd_version}-linux-x64/scripts
cp scripts/util.py %{buildroot}/usr/local/%{name}-%{osd_version}-linux-x64/scripts
cp scripts/osd-post-start.sh %{buildroot}/usr/local/%{name}-%{osd_version}-linux-x64/scripts
cp scripts/removeOldOSDIndices.py %{buildroot}/usr/local/%{name}-%{osd_version}-linux-x64/scripts
cp -a plugins/ %{buildroot}/usr/local/%{name}-%{osd_version}-linux-x64/
find %{buildroot} -type f -name "*.py" -exec sed -i '1s|#!.*python|#!/usr/bin/python3|' {} +
find %{buildroot} -type f \( -name "*.md" -o -name "*.json" -o -name "*.js" \) -exec chmod -x {} +
mkdir -p %{buildroot}/usr/local/www/probe/
ln -sf /usr/local/%{name}-%{osd_version}-linux-x64 %{buildroot}/usr/local/www/probe/%{name}-%{osd_version}-linux-x64
%post
chown -R nginx:nginx /usr/local/%{name}-%{osd_version}-linux-x64
/usr/bin/systemctl daemon-reload
/usr/bin/systemctl disable opensearch-dashboards.service
/usr/bin/systemctl enable opensearch-dashboards.service
%files
%defattr(-,nginx,nginx,-)
/usr/local/www/probe/
/usr/local/%{name}-%{osd_version}-linux-x64
%attr(0644,root,root) /lib/systemd/system/opensearch-dashboards.service
