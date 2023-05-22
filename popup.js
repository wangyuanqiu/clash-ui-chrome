// chrome.proxy.settings.get({}, function(config) {
//   console.log(JSON.stringify(config));
// });
//

async function requestClash(api, init) {
  const res = await fetch(`http://127.0.0.1:9090${api}`, init);
  return res.json();
}

async function getClashVersion() {
  const data = await requestClash("/version");
  const { version = false } = data;
  return version;
}

async function setClashVersion() {
  const node = document.querySelector("#clash-version");
  try {
    const version = await getClashVersion();
    node.textContent = `Clash version: ${version}`;
  } catch (error) {
    node.textContent = `${error.message}, clash server is not running.`;
  }
}

async function getProxySettings() {
  // {"incognitoSpecific":false,"levelOfControl":"controllable_by_this_extension","value":{"mode":"system"}}
  const settings = await chrome.proxy.settings.get({
    incognito: true,
  });
  return settings.value;
}

async function setProxySettings(enable) {
  const config = enable
    ? {
      mode: "fixed_servers",
      rules: {
        proxyForHttp: {
          host: "127.0.0.1",
          port: 7890,
        },
        proxyForHttps: {
          host: "127.0.0.1",
          port: 7890,
        },
        bypassList: ["alibaba-inc.com"],
      },
    }
    : { mode: "system" };
  chrome.proxy.settings.set({ value: config, scope: "regular" });
}

async function setProxyCheckbox() {
  const { mode } = await getProxySettings();
  const checkbox = document.querySelector("#proxy-checkbox");
  if (mode === "fixed_servers") {
    checkbox.setAttribute("checked", true);
  } else {
    checkbox.removeAttribute("checked");
  }
  checkbox.addEventListener("change", function(event) {
    const checked = event.target.checked;
    setProxySettings(checked);
  });
}

async function getProxyList() {
  return requestClash("/proxies");
}

async function updateProxy(name, value) {
  return requestClash(`/proxies/${name}`, {
    method: "PUT",
    body: JSON.stringify({ name: value }),
  });
}

async function setProxyList() {
  const container = document.querySelector("#proxy-list");
  const { proxies } = await getProxyList();
  clearElement(container);
  container.removeAttribute("hidden")
  Object.values(proxies).filter(({ type }) => type === "Selector").forEach(
    (proxy) => {
      const label = createElement(
        "label",
        { class: "block leading-6" },
        proxy.name,
      );
      const select = createElement(
        "select",
        { class: "block w-full rounded border-slate-400", value: proxy.now },
        proxy.all.map((name) =>
          createElement(
            "option",
            proxy.now === name ? { selected: true } : {},
            name,
          )
        ),
      );
      container.appendChild(createElement("div", {}, [label, select]));
      select.addEventListener("change", function(event) {
        updateProxy(proxy.name, event.target.value);
      });
    },
  );
}

function createElement(type, props, children) {
  const wrapChildren = (children) => {
    if (Array.isArray(children)) {
      return children.reduce(
        (pv, child) => [...pv, ...wrapChildren(child)],
        [],
      );
    }
    const type = typeof children;
    if (type === "undefined") {
      return [];
    }
    if (type === "string" || type === "number" || type === "boolean") {
      return [document.createTextNode(children)];
    }
    return [children];
  };

  const el = document.createElement(type);
  Object.keys(props).forEach((attr) => {
    el.setAttribute(attr, props[attr]);
  });
  wrapChildren(children).forEach((child) => el.appendChild(child));
  return el;
}

function clearElement(el) {
  while (el.firstChild) {
    el.removeChild(el.lastChild);
  }
}

(function() {
  setClashVersion();
  setProxyCheckbox();
  setProxyList();
})();
