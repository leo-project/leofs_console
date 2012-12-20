(function() {
  Ext.define("LeoTamer.model.Nodes", {
    extend: "Ext.data.Model",
    fields: ["type", "node", "status", "ring_hash_current", "ring_hash_previous", "joined_at"]
  });

  Ext.define("LeoTamer.Nodes", {
    extend: "Ext.panel.Panel",

    title: "Node Status",
    id: "nodes_panel",
    layout: "border",
    reload_interval: 30000,

    select_first_row: function() {
      var self = this;
      var grid = self.grid;
      grid.getStore().on("load", function() {
        grid.getSelectionModel().select(0);
      }, null, { single: true });
    },

    listeners: {
      activate: function(self) {
        self.select_first_row();

        self.reloader = {
          run: function() {
            self.store.load();
          },
          interval: self.reload_interval
        };
        Ext.TaskManager.start(self.reloader);
      },
      deactivate: function(self) {
        Ext.TaskManager.stop(self.reloader);
      }
    },
    
    command_store: Ext.create("Ext.data.Store", {
      fields: [ "command" ],
      data: [
        { command: "resume" },
        { command: "suspend" },
        { command: "detach" }
      ]
    }),

    detail_store: Ext.create("Ext.data.ArrayStore", {
      model: "LeoTamer.model.NameValue",
      proxy: {
        type: 'ajax',
        url: 'nodes/detail.json',
        reader: {
          type: 'json',
          root: 'data'
        },
        // disabe unused params
        noCache: false,
        limitParam: undefined,
        pageParam: undefined,
        sortParam: undefined,
        startParam: undefined,
        listeners: {
          exception: function(self, response, operation) {
            alert("Error on: \'" + self.url + "\'\n" + response.responseText);
          }
        }
      }
    }),
    
    do_send_command: function(node, command) {
      var self = this;

      Ext.Ajax.request({
        url: "nodes/execute",
        method: "POST",
        params: {
          node: node,
          command: command
        },
        success: function(response) {
          self.store.load();
        },
        failure: function(response) {
          Ext.Msg.alert("Error!", response.responseText);
        }
      });
    },

    confirm_send_command: function(node, command) {
      var self = this;

      Ext.Msg.on("beforeshow",  function (win) {
        win.defaultFocus = 2; // set default focus to "No" button
      });

      var msg = "Are you sure to send command '" + command + " " + node + "'?";
      Ext.Msg.confirm("Confirm", msg, function(btn) {
        if (btn == "yes") self.do_send_command(node, command);
      });
    },

    status_renderer: function(val) {
      var src;
      switch (val) {
        case "running":
          src = "images/running.png";
          break;
        case "stop":
        case "downed":
          src = "images/error.png";
          break;
        case "attached":
          src = "images/add.png";
          break;
        case "suspend":
          src = "images/warn.png";
          break;
        default:
          throw "invalid status specified.";
      }
      return "<img class='status' src='" + src + "'> " + val;
    },

    grid_grouping: Ext.create("Ext.grid.feature.Grouping", {
      groupHeaderTpl: "{name} ({rows.length} node{[values.rows.length > 1 ? 's' : '']})"
    }),

    rewrite_status_body: function(self, node_stat) {
      var name = node_stat.node;
      var status = node_stat.status;

      self.status_panel.setTitle("status of " + name);
      name_line = "Node Name: " + name;
      status_line = "Status: " + self.status_renderer(status);
      self.status_body.update(name_line + "<br>" + status_line);

      var change_status_button = Ext.getCmp("change_status_button");

      if (node_stat.type == "Gateway") {
         change_status_button.hide();
      }
      else {
         change_status_button.show();
      }
    },

    on_grid_select: function(self, record) {
      var node_stat = record.data;

      self.rewrite_status_body(self, node_stat);

      self.detail_store.load({ 
        params: { 
          node: node_stat.node,
          type: node_stat.type
        }
      });
    },

    initComponent: function() {
      var self = this;

      self.send_command = function() {
        var node, command_combo, command_select_window;  

        node = self.grid.getSelectionModel().getSelection()[0].data;

        command_combo = Ext.create("Ext.form.ComboBox", {
          padding: 10,
          store: self.command_store,
          labelWidth: 125,
          fieldLabel: "Execute Command",
          displayField: "command",
          valueField: "command",
          emptyText: "Select Command",
          allowBlank: false,
          editable: false
        });

        command_select_window = Ext.create('Ext.window.Window', {
          title: node.node,
          items: command_combo,
          buttons: [{
            text: "Apply",
            handler: function() {
              var command = command_combo.getValue();
              self.confirm_send_command(node.node, command);
              command_select_window.close();
            }
          }, {
            text: "Cancel",
            handler: function() {
              command_select_window.close();
            }
          }]
        }).show();
      };
    
      self.status_body = Ext.create("Ext.Panel", {
        id: "node_status",
        border: false,
        padding: 5,
        height: 70,
        buttons: [{
          xtype: "button",
          id: "change_status_button",
          text: "Change Status",
          handler: self.send_command
        }]
      });

      self.status_panel = Ext.create("Ext.Panel", {
        title: "status",
        region: "east",
        width: 300,
        resizable: false,
        items: [
          self.status_body,
          {
            xtype: 'grid',
            title: "defail information",
            border: false,
            forceFit: true,
            hideHeaders: true,
            store: self.detail_store,
            columns: [
              {
                dataIndex: "name",
                text: "Name"
              }, {
                dataIndex: "value",
                text: "Value"
              }
            ],
            listeners: {
              beforeselect: function() {
                return false; // disable row select
              }
            }
          }
        ]
      });

      self.store = Ext.create("Ext.data.Store", {
        model: "LeoTamer.model.Nodes",
        groupField: 'type',
        proxy: {
          type: 'ajax',
          url: 'nodes/status.json',
          reader: {
            type: 'json',
            root: 'data'
          },
          // disable unused params
          noCache: false,
          limitParam: undefined,
          pageParam: undefined,
          sortParam: undefined,
          startParam: undefined,
          groupParam: undefined,
          listeners: {
            exception: function(store, response, operation) {
              alert("Error on: \'" + store.url + "\'\n" + response.responseText);
            }
          }
        }
      });

      self.grid = Ext.create("Ext.grid.Panel", {
        title: 'Nodes',
        store: self.store,
        region: "center",
        forceFit: true,
        features: [ self.grid_grouping ],
        viewConfig: {
          trackOver: false
        },
        columns: [
          {
            dataIndex: "type"
          }, {
            text: "Node",
            dataIndex: 'node',
            sortable: true
          }, {
            text: "Status",
            dataIndex: 'status',
            renderer: self.status_renderer,
            sortable: true
          }, {
            text: "Ring (Cur)",
            dataIndex: 'ring_hash_current'
          }, {
            text: "Ring (Prev)",
            dataIndex: 'ring_hash_previous'
          }, {
            text: "Joined At",
            dataIndex: "joined_at"
          }
        ],
        tbar: [
          {
            xtype: "textfield",
            fieldLabel: "<img src='images/filter.png'> Filter:",
            labelWidth: 50,
            listeners: {
              change: function(text_field, new_value) {
                var store = self.store;
                store.clearFilter();
                store.filter("node", new RegExp(new_value));
              }
            }
          },
          "->",
          {
            xtype: "button",
            icon: "images/reload.png",
            handler: function() {
              self.store.load();
            }
          }
        ],
        listeners: {
          render: function(grid) {
            grid.getStore().on("load", function() {
              grid.getSelectionModel().select(self.selected_index);
            });
          },
          beforeselect: function(grid, record, index) {
            self.selected_index = index;
          },
          select: function(grid, record, index) {
            self.on_grid_select(self, record);
          }
        }
      });

      Ext.apply(self, {
        items: [self.grid, self.status_panel]
      });

      return self.callParent(arguments);
    }
  });

}).call(this);
