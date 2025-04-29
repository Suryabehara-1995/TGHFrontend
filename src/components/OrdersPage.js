import React, { useState, useEffect } from "react";
import { Table, Input, Row, Col, Button, Tabs, Checkbox, Drawer } from "antd";
import { Resizable } from "react-resizable";
import moment from "moment";
import { Calendar } from "primereact/calendar";
import "primereact/resources/themes/saga-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";
import { ShoppingOutlined, FilterOutlined } from "@ant-design/icons";

const { Search } = Input;
const { TabPane } = Tabs;

const ResizableTitle = (props) => {
  const { onResize, width, ...restProps } = props;

  if (!width) {
    return <th {...restProps} />;
  }

  return (
    <Resizable
      width={width}
      height={0}
      handle={
        <span
          className="react-resizable-handle"
          onClick={(e) => e.stopPropagation()}
        />
      }
      onResize={onResize}
      draggableOpts={{ enableUserSelectHack: false }}
    >
      <th {...restProps} />
    </Resizable>
  );
};

const OrdersPage = ({ orders = [], columnWidths, handleResize }) => {
  const [searchText, setSearchText] = useState("");
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [dateRange, setDateRange] = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const [shiprocketStatuses, setShiprocketStatuses] = useState([]);
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);

  useEffect(() => {
   
    orders.forEach((order, index) => {
    
    });
   
    applyFilters({});
  }, [orders]);

  const applyFilters = ({
    search,
    dateRange: newDateRange,
    shiprocketStatuses: statuses,
    tab = activeTab,
  } = {}) => {
    let filtered = orders ? [...orders] : [];

  

    // Apply search filter
    if (filtered.length && (search !== undefined ? search : searchText)) {
      const value = (search !== undefined ? search : searchText).toLowerCase();
      filtered = filtered.filter((order) => {
        const { orderID, customer } = order;
        const { name, email, mobile } = customer || {};
        return (
          (orderID || "").toLowerCase().includes(value) ||
          (name || "").toLowerCase().includes(value) ||
          (email || "").toLowerCase().includes(value) ||
          (mobile || "").toLowerCase().includes(value)
        );
      });
      
    }

    // Apply date range filter
    const activeDateRange = newDateRange !== undefined ? newDateRange : dateRange;
    if (filtered.length && activeDateRange && activeDateRange[0] && activeDateRange[1]) {
      const startDate = moment(activeDateRange[0]).utcOffset(0, true).startOf("day"); // Force UTC without offset shift
      const endDate = moment(activeDateRange[1]).utcOffset(0, true).endOf("day");
    //  console.log(`Date range filter: Start ${startDate.format("YYYY-MM-DD HH:mm:ss")} to End ${endDate.format("YYYY-MM-DD HH:mm:ss")} (UTC)`);
      filtered = filtered.filter((order) => {
        const orderDate = moment(order.order_date).utc();
        const orderDateDay = orderDate.format("YYYY-MM-DD");
   
        return orderDate.isBetween(startDate, endDate, null, "[]");
      });
     
    } else {
     
    }

    // Apply tab-specific filters
    if (filtered.length) {
      if (tab === "completed") {
        filtered = filtered.filter((order) => order.packed_status === "Completed");
      } else if (tab === "hold") {
        filtered = filtered.filter((order) => order.packed_status === "Hold");
      } else if (tab === "override") {
        filtered = filtered.filter((order) => order.packed_status === "Overridden");
      } else if (tab === "shiprocket" && (statuses || shiprocketStatuses).length > 0) {
        const activeStatuses = statuses || shiprocketStatuses;
        filtered = filtered.filter((order) =>
          activeStatuses.includes(order.shipments?.[0]?.status || "N/A")
        );
      }
    //  console.log(`After tab-specific filter (${tab}): ${filtered.length}`);
    }

    setFilteredOrders(filtered);
  };

  const handleSearch = (value) => {
    setSearchText(value);
    applyFilters({ search: value });
  };

  const handleDateChange = (e) => {
    const newDateRange = e.value;
    setDateRange(newDateRange);
    applyFilters({ dateRange: newDateRange });
   // console.log("Selected Date Range:", newDateRange ? [moment(newDateRange[0]).format("YYYY-MM-DD"), moment(newDateRange[1]).format("YYYY-MM-DD")] : "No range selected");
  };

  const handleTabChange = (key) => {
    setActiveTab(key);
    setSearchText("");
    setDateRange(null);
    setShiprocketStatuses([]);
    applyFilters({ tab: key, dateRange: null, shiprocketStatuses: [] });
  };

  const handleShiprocketStatusChange = (checkedValues) => {
    setShiprocketStatuses(checkedValues);
    applyFilters({ shiprocketStatuses: checkedValues });
  };

  const handleShowAllOrders = () => {
    setSearchText("");
    setDateRange(null);
    setShiprocketStatuses([]);
    applyFilters({ dateRange: null, shiprocketStatuses: [] });
  };

  const columns = [
    {
      title: "S.No",
      key: "sno",
      width: columnWidths["sno"] || 50,
      render: (_, __, index) => index + 1,
    },
    {
      title: "Order ID",
      dataIndex: "orderID",
      key: "orderID",
      width: columnWidths["orderID"] || 150,
    },
    {
      title: "Customer Name",
      dataIndex: ["customer", "name"],
      key: "customer_name",
      width: columnWidths["customer_name"] || 150,
    },
    {
      title: "Customer Mobile",
      dataIndex: ["customer", "mobile"],
      key: "customer_mobile",
      width: columnWidths["customer_mobile"] || 130,
    },
    {
      title: "Customer Email",
      dataIndex: ["customer", "email"],
      key: "customer_email",
      width: columnWidths["customer_email"] || 200,
    },
    {
      title: "Courier",
      dataIndex: ["shipments", 0, "courier_name"],
      key: "courier_name",
      width: columnWidths["courier_name"] || 150,
      render: (text) => text || "N/A",
    },
    {
      title: "AWB Code",
      dataIndex: ["shipments", 0, "awb_code"],
      key: "awb_code",
      width: columnWidths["awb_code"] || 150,
      render: (text) => text || "N/A",
    },
    {
      title: "ShipRocket Status",
      dataIndex: ["shipments", 0, "status"],
      key: "order_status",
      width: columnWidths["order_status"] || 150,
      render: (status) => (
        <span
          style={{
            padding: "4px 8px",
            borderRadius: "12px",
            background: status === "OUT FOR PICKUP" ? "#e6f7ff" : "#fff3e6",
            color: status === "OUT FOR PICKUP" ? "#1890ff" : "#663300",
          }}
        >
          {status || "N/A"}
        </span>
      ),
    },
    {
      title: "Packing Status",
      dataIndex: "packed_status",
      key: "packed_status",
      width: columnWidths["packed_status"] || 120,
      render: (status) => (
        <span
          style={{
            padding: "4px 8px",
            borderRadius: "12px",
            background:
              status === "Completed"
                ? "#e6ffe6"
                : status === "Hold"
                ? "#fff3e6"
                : status === "Override"
                ? "#f0f0f0"
                : "#fff3e6",
            color:
              status === "Completed"
                ? "#006600"
                : status === "Hold"
                ? "#ff9900"
                : status === "Override"
                ? "#666"
                : "#663300",
          }}
        >
          {status}
        </span>
      ),
    },
    {
      title: "Order Date",
      dataIndex: "order_date",
      key: "order_date",
      width: columnWidths["order_date"] || 120,
      render: (text) => (text ? moment(text).format("DD-MM-YYYY") : "N/A"),
    },
  ];

  const expandedRowRender = (record) => {
    const holdDetails = activeTab === "hold" && (
      <div style={{ marginBottom: "20px" }}>
        <h4 style={{ marginBottom: "10px" }}>Hold Details</h4>
        <Table
          columns={[
            {
              title: "Hold Reason",
              dataIndex: "hold_reason",
              key: "hold_reason",
              width: 200,
              render: (text) => text || "N/A",
            },
            {
              title: "Hold Date",
              dataIndex: "hold_date",
              key: "hold_date",
              width: 120,
              render: (text) =>
                text ? moment(text).format("DD-MM-YYYY") : "N/A",
            },
            {
              title: "Hold By",
              dataIndex: "hold_by",
              key: "hold_by",
              width: 150,
              render: (text) => text || "N/A",
            },
          ]}
          dataSource={[record]}
          pagination={false}
          bordered
          size="small"
        />
      </div>
    );

    return (
      <div style={{ padding: "10px", background: "#fafafa" }}>
        {holdDetails}
        <h4 style={{ marginBottom: "10px" }}>Product Details</h4>
        <Table
          columns={[
            {
              title: "Product ID",
              dataIndex: "id",
              key: "id",
              width: 120,
            },
            {
              title: "Product Name",
              dataIndex: "name",
              key: "name",
              width: 200,
            },
            {
              title: "Product SKU",
              dataIndex: "sku",
              key: "sku",
              width: 200,
            },
            {
              title: "Product Weight",
              dataIndex: "weight",
              key: "weight",
              width: 200,
              render: (weight) => (weight ? `${weight} kg` : "N/A"),
            },
            {
              title: "Updated ID",
              dataIndex: "updated_id",
              key: "updated_id",
              width: 120,
            },
            {
              title: "Quantity",
              dataIndex: "quantity",
              key: "quantity",
              width: 100,
              align: "center",
            },
            {
              title: "Image",
              dataIndex: "imageUrl",
              key: "imageUrl",
              width: 100,
              render: (imageUrl) => (
                <img
                  src={imageUrl}
                  alt="Product"
                  style={{ width: "50px", height: "50px" }}
                />
              ),
            },
            {
              title: "Location",
              dataIndex: "productLocation",
              key: "productLocation",
              width: 150,
            },
            {
              title: "Category",
              dataIndex: "productCategory",
              key: "productCategory",
              width: 150,
            },
          ]}
          dataSource={record.products || []}
          rowKey="id"
          pagination={false}
          bordered
          size="small"
          style={{ marginBottom: "15px" }}
        />

        <h4 style={{ marginBottom: "10px" }}>Packing & Warehouse Details</h4>
        <Table
          columns={[
            {
              title: "Date",
              dataIndex: "packed_date",
              key: "packed_date",
              width: 120,
              render: (text) =>
                text ? moment(text).format("DD-MM-YYYY") : "N/A",
            },
            {
              title: "Time",
              dataIndex: "packed_time",
              key: "packed_time",
              width: 120,
            },
            {
              title: "Packed Person Name",
              dataIndex: "packed_person_name",
              key: "packed_person_name",
              width: 180,
            },
            {
              title: "Warehouse Out",
              dataIndex: "warehouse_out",
              key: "warehouse_out",
              width: 150,
            },
            {
              title: "Warehouse Out Date",
              dataIndex: "warehouse_out_date",
              key: "warehouse_out_date",
              width: 150,
              render: (text) =>
                text ? moment(text).format("DD-MM-YYYY") : "N/A",
            },
            {
              title: "Warehouse Out Time",
              dataIndex: "warehouse_out_time",
              key: "warehouse_out_time",
              width: 120,
            },
          ]}
          dataSource={[record]}
          pagination={false}
          bordered
          size="small"
        />
      </div>
    );
  };

  const rowClassName = (record) => {
    if (activeTab === "all" && moment(record.order_date).utc().isSame(moment().utc(), "day")) {
      return "today-order";
    }
    return "";
  };

  const enhancedColumns = columns.map((col, index) => ({
    ...col,
    onHeaderCell: (column) => ({
      width: column.width,
      onResize: handleResize(index),
    }),
  }));

  const todayOrdersCount = orders ? orders.filter((order) =>
    moment(order.order_date).utc().isSame(moment().utc(), "day")
  ).length : 0;

  const shiprocketStatusOptions = orders ? [
    ...new Set(orders.map((order) => order.shipments?.[0]?.status || "N/A")),
  ].map((status) => ({
    label: status,
    value: status,
  })) : [];

  return (
    <div style={{ padding: "10px" }}>
      <style>
        {`
          .today-order {
            background-color: #e6f7ff !important;
          }
        `}
      </style>
      <Tabs
        className="order-tabs"
        activeKey={activeTab}
        onChange={handleTabChange}
        style={{ 
          marginBottom: "20px", 
          background: "#fff", 
          padding: "14px", 
          borderRadius: "15px" 
        }}
        tabBarExtraContent={
          activeTab === "shiprocket" && (
            <Button
              icon={<FilterOutlined />}
              onClick={() => setIsFilterModalVisible(true)}
              style={{ marginRight: "10px" }}
            >
              Filter Status
            </Button>
          )
        }
      >
        <TabPane tab={`All Orders (${orders ? orders.length : 0})`} key="all" />
        <TabPane
          tab={`Packing Completed (${
            orders ? orders.filter((order) => order.packed_status === "Completed").length : 0
          })`}
          key="completed"
        />
        <TabPane
          tab={`Packing Hold (${
            orders ? orders.filter((order) => order.packed_status === "Hold").length : 0
          })`}
          key="hold"
        />
        <TabPane
          tab={`Packing Override (${
            orders ? orders.filter((order) => order.packed_status === "Overridden").length : 0
          })`}
          key="override"
        />
        <TabPane tab="ShipRocket Status" key="shiprocket" />
      </Tabs>

      <Drawer
        title="Filter ShipRocket Status"
        placement="right"
        onClose={() => setIsFilterModalVisible(false)}
        visible={isFilterModalVisible}
        width={300}
      >
        <Checkbox.Group
          options={shiprocketStatusOptions}
          value={shiprocketStatuses}
          onChange={handleShiprocketStatusChange}
          style={{ display: "flex", flexDirection: "column", gap: "10px" }}
        />
        <Button
          type="primary"
          onClick={() => setIsFilterModalVisible(false)}
          style={{ marginTop: "20px" }}
        >
          Apply
        </Button>
      </Drawer>

      <Row justify="space-between" align="middle" style={{ marginBottom: "20px" }}>
        <Col>
          <h3>
            <ShoppingOutlined style={{ marginLeft: "8px", color: "#1890ff" }} />{" "}
            {activeTab === "all"
              ? "All Orders"
              : activeTab === "completed"
              ? "Packing Completed"
              : activeTab === "hold"
              ? "Packing Hold"
              : activeTab === "override"
              ? "Packing Override"
              : "ShipRocket Status"}
            <span style={{ marginLeft: "4px" }}>
              {filteredOrders.length}
              {dateRange && dateRange[0] && dateRange[1] ? `(Filtered)` : ""}
            </span>
          </h3>
        </Col>
        <Col>
          <Search
            placeholder="Search by Order ID, Name, Email, Phone"
            onSearch={handleSearch}
            enterButton
            value={searchText}
            onChange={(e) => handleSearch(e.target.value)}
            style={{ width: 300, marginRight: "10px" }}
          />
          <Calendar
            value={dateRange}
            onChange={handleDateChange}
            selectionMode="range"
            readOnlyInput
            dateFormat="dd/mm/yy"
            placeholder="Select Date Range"
            showIcon
            style={{ marginRight: "10px" }}
          />
          <span style={{ marginLeft: "10px" }}>
            Today's Orders: {todayOrdersCount}
          </span>
        </Col>
        <Col>
          <Button onClick={handleShowAllOrders}>Show All Orders</Button>
        </Col>
      </Row>
      <Table
        components={{ header: { cell: ResizableTitle } }}
        columns={enhancedColumns}
        dataSource={filteredOrders}
        rowKey="orderID"
        pagination={{ position: ["bottomCenter"] }}
        bordered
        size="middle"
        expandable={{ expandedRowRender }}
        tableLayout="unset"
        scroll={{ x: "max-content" }}
        rowClassName={rowClassName}
      />
    </div>
  );
};

export default OrdersPage;
