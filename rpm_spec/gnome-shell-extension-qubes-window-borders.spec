%global uuid qubes-window-borders@a.pebl.cc
%global debug_package %{nil}

Name: gnome-shell-extension-qubes-window-borders
Version: 0.1.0
Release: %autorelease

Summary: Draw colored window borders for VMs on Qubes OS
License: GPLv2+
URL: https://github.com/apebl/gnome-ext-qubes-windows-borders

Source0: %{name}-%{version}.tar.gz

BuildRequires: make
BuildRequires: %{_bindir}/glib-compile-schemas

Requires: gnome-shell-extension-common

%description
This extension draws colored window borders for VMs on Qubes OS 

%prep
%setup -q

%build
make build

%install
make install DESTDIR=%{buildroot}%{_datadir}

%files
%license COPYING
%{_datadir}/gnome-shell/extensions/%{uuid}

%changelog
%autochangelog
