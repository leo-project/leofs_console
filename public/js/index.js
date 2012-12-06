(function() {
  Highcharts.setOptions({
    credits: { enabled: false },
    global: { useUTC: false }
  });

  Ext.onReady(function() {
    var node_status, tabs, viewport;
    var get_credential;
    
    node_status = Ext.create("LeoTamer.Nodes");

    admin = Ext.create("LeoTamer.Admin");

    tabs = Ext.create("Ext.TabPanel", {
      region: "center",
      activeTab: 0,
      defaults: { bodyPadding: 5 },
      items: [
        node_status,
        admin
      ]
    });

    get_credential = function() {
      Ext.Ajax.request({
        url: "user_credential.json",
        method: "GET",
        success: function(response, opts) {
          console.log(response, opts);
          Ext.Msg.alert("Your Credential", response.responseText);
        },
        failure: function(response, opts) {
          console.log(response, opts);
        }
      })
    };

    header = Ext.create("Ext.toolbar.Toolbar", {
      region: "north",
      border: false,
      items: [
        { 
          xtype: "image",
          width: 75,
          src: "images/leofs-logo-0.png"
        },
        "->",
        {
          text: Ext.util.Cookies.get("user_id"),
          menu: {
            xtype: "menu",
            showSeparator: false,
            items: [
            /*
              { text: "My Account" },
              { text: "Account Activity" },
              { text: "Usage Reports" },
            */
              { text: "History" },
              { 
                text: "Security Credentials",
                handler: get_credential
              },
              "-",
              { 
                text: "Sign Out",
                handler: function() {
                  window.location = "/logout"
                }
              }
            ]
          }
        }
      ]
    });

    return viewport = Ext.create("Ext.Viewport", {
      layout: "border",
      items: [
        header,
        tabs
      ]
    });
  });
}).call(this);
