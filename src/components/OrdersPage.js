import React, { useState, useEffect } from "react";
import { Table, Input, Row, Col, Button, Tabs, Checkbox, Drawer, Select, Card, Tag, Space, Typography, Grid } from "antd";
import { Resizable } from "react-resizable";
import moment from "moment";
import { Calendar } from "primereact/calendar";
import "primereact/resources/themes/saga-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";
import { ShoppingOutlined, FilterOutlined, DownloadOutlined, ReloadOutlined } from "@ant-design/icons";
import * as XLSX from "xlsx";

const { Search } = Input;
const { TabPane } = Tabs;
const { Option } = Select;
const { Text } = Typography;
const { useBreakpoint } = Grid;

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

const OrdersPage = ({ orders = [], columnWidths = {}, handleResize }) => {
  const [searchText, setSearchText] = useState("");
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [dateRange, setDateRange] = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const [shiprocketStatuses, setShiprocketStatuses] = useState([]);
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [packingStatusFilter, setPackingStatusFilter] = useState(null);
  const [sortOrder, setSortOrder] = useState(null);
  const screens = useBreakpoint();

  // Initialize columnWidths with default values if not provided
  const initialColumnWidths = {
    sno: 70,
    orderID: 180,
    customer: 250,
    shipping: 220,
    order_status: 180,
    packed_status: 150,
    order_date: 140,
    warehouse_out_status: 120,
    ...columnWidths,
  };

  const [localColumnWidths, setLocalColumnWidths] = useState(initialColumnWidths);

  useEffect(() => {
    applyFilters({});
  }, [orders]);

  const handleResizeLocal = (index) => (e, { size }) => {
    const columnKeys = Object.keys(localColumnWidths);
    const columnKey = columnKeys[index];
    
    if (columnKey) {
      const newWidths = {
        ...localColumnWidths,
        [columnKey]: size.width,
      };
      setLocalColumnWidths(newWidths);
      
      // Call the parent handleResize if provided
      if (handleResize) {
        handleResize(newWidths);
      }
    }
  };

  const applyFilters = ({
    search,
    dateRange: newDateRange,
    shiprocketStatuses: statuses,
    tab = activeTab,
    packingStatus = packingStatusFilter,
    sort = sortOrder,
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
      const startDate = moment(activeDateRange[0]).utcOffset(0, true).startOf("day");
      const endDate = moment(activeDateRange[1]).utcOffset(0, true).endOf("day");
      filtered = filtered.filter((order) => {
        const orderDate = moment(order.order_date).utc();
        return orderDate.isBetween(startDate, endDate, null, "[]");
      });
    }

    // Apply packing status filter
    if (filtered.length && packingStatus) {
      filtered = filtered.filter((order) => 
        packingStatus === "Completed" 
          ? order.packed_status === "Completed"
          : order.packed_status !== "Completed"
      );
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
    }

    // Apply sorting
    if (filtered.length && sort) {
      filtered.sort((a, b) => {
        if (sort === "packed_asc") {
          return a.packed_status.localeCompare(b.packed_status);
        } else if (sort === "packed_desc") {
          return b.packed_status.localeCompare(a.packed_status);
        }
        return 0;
      });
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
  };

  const handleTabChange = (key) => {
    setActiveTab(key);
    setSearchText("");
    setDateRange(null);
    setShiprocketStatuses([]);
    setPackingStatusFilter(null);
    applyFilters({ tab: key, dateRange: null, shiprocketStatuses: [], packingStatus: null });
  };

  const handleShiprocketStatusChange = (checkedValues) => {
    setShiprocketStatuses(checkedValues);
    applyFilters({ shiprocketStatuses: checkedValues });
  };

  const handlePackingStatusChange = (value) => {
    setPackingStatusFilter(value);
    applyFilters({ packingStatus: value });
  };

  const handleSortChange = (value) => {
    setSortOrder(value);
    applyFilters({ sort: value });
  };

  const handleShowAllOrders = () => {
    setSearchText("");
    setDateRange(null);
    setShiprocketStatuses([]);
    setPackingStatusFilter(null);
    setSortOrder(null);
    applyFilters({ dateRange: null, shiprocketStatuses: [], packingStatus: null, sort: null });
  };

  const handleDownloadExcel = () => {
    if (!filteredOrders.length) return;

    const excelData = filteredOrders.map((order) => ({
      "Order ID": order.orderID,
      "Customer Name": order.customer?.name || "N/A",
      "Customer Mobile": order.customer?.mobile || "N/A",
      "Customer Email": order.customer?.email || "N/A",
      "Courier": order.shipments?.[0]?.courier_name || "N/A",
      "AWB Code": order.shipments?.[0]?.awb_code || "N/A",
      "ShipRocket Status": order.shipments?.[0]?.status || "N/A",
      "Packing Status": order.packed_status || "N/A",
      "Order Date": order.order_date ? moment(order.order_date).format("DD-MM-YYYY") : "N/A",
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Orders");
    
    const fileName = dateRange && dateRange[0] && dateRange[1]
      ? `Orders_${moment(dateRange[0]).format("YYYYMMDD")}_${moment(dateRange[1]).format("YYYYMMDD")}.xlsx`
      : "Orders.xlsx";
    
    XLSX.writeFile(workbook, fileName);
  };

  const getStatusTagColor = (status) => {
    switch (status) {
      case "OUT FOR PICKUP":
        return "blue";
      case "PICKED UP":
        return "cyan";
      case "IN TRANSIT":
        return "geekblue";
      case "DELIVERED":
        return "green";
      case "RTO":
        return "volcano";
      default:
        return "default";
    }
  };

  const getPackingStatusTagColor = (status) => {
    switch (status) {
      case "Completed":
        return "success";
      case "Hold":
        return "warning";
      case "Overridden":
        return "processing";
      default:
        return "default";
    }
  };

  const getColumns = () => {
    const baseColumns = [
      {
        title: "S.No",
        key: "sno",
        width: localColumnWidths.sno,
        render: (_, __, index) => index + 1,
        align: 'center',
      },
      {
        title: "Order ID",
        dataIndex: "orderID",
        key: "orderID",
        width: localColumnWidths.orderID,
        render: (text) => <Text strong>{text}</Text>,
      },
      {
        title: "Customer",
        key: "customer",
        width: localColumnWidths.customer,
        render: (_, record) => (
          <div>
            <div style={{ fontWeight: 500 }}>{record.customer?.name || "N/A"}</div>
            {!screens.xs && (
              <>
                <div style={{ color: '#666', fontSize: '12px' }}>{record.customer?.email || "N/A"}</div>
                <div style={{ color: '#666', fontSize: '12px' }}>{record.customer?.mobile || "N/A"}</div>
              </>
            )}
          </div>
        ),
      },
      {
        title: "Shipping",
        key: "shipping",
        width: localColumnWidths.shipping,
        render: (_, record) => (
          <div>
            <div><Text type="secondary">Courier:</Text> {record.shipments?.[0]?.courier_name || "N/A"}</div>
            {!screens.xs && (
              <div><Text type="secondary">AWB:</Text> {record.shipments?.[0]?.awb_code || "N/A"}</div>
            )}
          </div>
        ),
      },
      {
        title: "Status",
        dataIndex: ["shipments", 0, "status"],
        key: "order_status",
        width: localColumnWidths.order_status,
        render: (status) => (
          <Tag color={getStatusTagColor(status)} style={{ borderRadius: '12px' }}>
            {status || "N/A"}
          </Tag>
        ),
      },
      {
        title: "Packing Status",
        dataIndex: "packed_status",
        key: "packed_status",
        width: localColumnWidths.packed_status,
        render: (status) => (
          <Tag color={getPackingStatusTagColor(status)} style={{ borderRadius: '12px' }}>
            {status}
          </Tag>
        ),
      },
   {
        title: "Warehouse Out",
        key: "warehouse_out_status",
        width: localColumnWidths.warehouse_out_status,
        render: (_, record) => (
          <div>
            <Tag
              color={record.warehouse_out_date ? 'success' : 'default'}
              style={{ borderRadius: '12px' }}
            >
              {record.warehouse_out_date ? 'Completed' : 'Not Completed'}
            </Tag>
            {!screens.xs && record.warehouse_out_date && (
              <div style={{ color: '#666', fontSize: '12px' }}>
                {moment(record.warehouse_out_date).format("DD-MM-YYYY")}
              </div>
            )}
          </div>
        ),
      },
      {
        title: "Date",
        dataIndex: "order_date",
        key: "order_date",
        width: localColumnWidths.order_date,
        render: (text) => (
          <div>
            <div>{text ? moment(text).format("DD-MM-YYYY") : "N/A"}</div>
            {!screens.xs && (
              <div style={{ color: '#666', fontSize: '12px' }}>
                {text ? moment(text).format("hh:mm A") : ""}
              </div>
            )}
          </div>
        ),
        align: 'center',
      },
    ];

    // For mobile view, show fewer columns
    if (screens.xs) {
      return baseColumns.filter(col => 
        ['sno', 'orderID', 'order_status', 'packed_status'].includes(col.key)
      );
    }

    // For tablet view, show more columns but not all details
    if (screens.sm && !screens.md) {
      return baseColumns.filter(col => 
        !['customer', 'shipping'].includes(col.key)
      );
    }

    return baseColumns;
  };

  const expandedRowRender = (record) => {
    return (
      <div style={{ padding: "16px", background: "#fafafa" }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {activeTab === "hold" && (
            <Card title="Hold Details" size="small">
              <Row gutter={16}>
                <Col xs={24} sm={12} md={8}>
                  <Text strong>Hold Reason:</Text> {record.hold_reason || "N/A"}
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Text strong>Hold Date:</Text> {record.hold_date ? moment(record.hold_date).format("DD-MM-YYYY") : "N/A"}
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Text strong>Hold By:</Text> {record.hold_by || "N/A"}
                </Col>
              </Row>
            </Card>
          )}

          <div title="Product Details" size="small">
            <h4>Product Details</h4>
            <Table
              columns={[
                {
                  title: "Product",
                  key: "product",
                  render: (_, product) => (
                    <Space>
                      <img
                        src={product.imageUrl}
                        alt="Product"
                        style={{ width: "50px", height: "50px", objectFit: 'cover' }}
                      />
                      <div>
                        <div style={{ fontWeight: 500 }}>{product.name}</div>
                        <div style={{ color: '#666' }}>SKU: {product.sku}</div>
                      </div>
                    </Space>
                  ),
                },
                ...(screens.xs ? [] : [
                  {
                    title: "Details",
                    key: "details",
                    render: (_, product) => (
                      <Space direction="vertical" size={0}>
                        <div><Text type="secondary">ID:</Text> {product.id}</div>
                        <div><Text type="secondary">Weight:</Text> {product.weight ? `${product.weight} kg` : "N/A"}</div>
                        <div><Text type="secondary">Category:</Text> {product.productCategory || "N/A"}</div>
                          <div><Text type="secondary">Location:</Text> {product.productLocation || "N/A"}</div>
                          <div><Text type="secondary">updated ID:</Text> {product.updated_id || "N/A"}</div>

                      </Space>
                    ),
                  },
                  ...(screens.sm ? [] : [
                    {
                      title: "Category",
                      dataIndex: "productCategory",
                      key: "productCategory",
                    },
                  ]),
                ]),
                {
                  title: "Qty",
                  dataIndex: "quantity",
                  key: "quantity",
                  align: 'center',
                  render: (text) => <Tag>{text}</Tag>,
                },
              ]}
              dataSource={record.products || []}
              rowKey="id"
              pagination={false}
              bordered
              size="small"
            />
          </div>

          {!screens.xs && (
            <Card title="Packing & Warehouse Details" size="small">
              <Row gutter={16}>
                <Col xs={24} sm={12} md={8}>
                  <div><Text strong>Packed Date:</Text> {record.packed_date ? moment(record.packed_date).format("DD-MM-YYYY") : "N/A"}</div>
                  <div><Text strong>Packed Time:</Text> {record.packed_time || "N/A"}</div>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <div><Text strong>Packed By:</Text> {record.packed_person_name || "N/A"}</div>
                  <div><Text strong>Warehouse:</Text> {record.warehouse_out || "N/A"}</div>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <div><Text strong>Out Date:</Text> {record.warehouse_out_date ? moment(record.warehouse_out_date).format("DD-MM-YYYY") : "N/A"}</div>
                  <div><Text strong>Out Time:</Text> {record.warehouse_out_time || "N/A"}</div>
                </Col>
              </Row>
            </Card>
          )}
        </Space>
      </div>
    );
  };

  const rowClassName = (record) => {
    if (activeTab === "all" && moment(record.order_date).utc().isSame(moment().utc(), "day")) {
      return "today-order";
    }
    return "";
  };

  const enhancedColumns = getColumns().map((col, index) => ({
    ...col,
    onHeaderCell: (column) => ({
      width: column.width,
      onResize: handleResizeLocal(index),
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

  const getTabCount = (tabKey) => {
    if (!orders) return 0;
    switch (tabKey) {
      case "all": return orders.length;
      case "completed": return orders.filter(o => o.packed_status === "Completed").length;
      case "hold": return orders.filter(o => o.packed_status === "Hold").length;
      case "override": return orders.filter(o => o.packed_status === "Overridden").length;
      default: return 0;
    }
  };

  return (
    <div style={{ padding: screens.xs ? "8px" : "16px" }}>
      <style>
        {`
          .today-order {
            background-color: #f0f9ff !important;
          }
          .react-resizable-handle {
            position: absolute;
            width: 10px;
            height: 100%;
            bottom: 0;
            right: -5px;
            cursor: col-resize;
            z-index: 1;
          }
          .ant-table-thead > tr > th {
            background: #f8fafc !important;
            font-weight: 600 !important;
          }
          .ant-tabs-tab {
            padding: 12px 8px !important;
          }
          @media (max-width: 768px) {
            .ant-tabs-tab {
              padding: 8px 4px !important;
            }
          }
        `}
      </style>

      <Card
        bordered={false}
        style={{ marginBottom: 16, borderRadius: 8, borderRight: '3px solid #3c77fa', }}
        bodyStyle={{ padding: screens.xs ? '8px' : '12px 16px' }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          tabBarExtraContent={
            <Space>
              {activeTab === "shiprocket" && (
                <Button
                  icon={<FilterOutlined />}
                  onClick={() => setIsFilterModalVisible(true)}
                  size={screens.xs ? "small" : "middle"}
                >
                  {screens.xs ? '' : 'Filter'}
                </Button>
              )}
              <Button
                icon={<ReloadOutlined />}
                onClick={handleShowAllOrders}
                size={screens.xs ? "small" : "middle"}
              >
                {screens.xs ? '' : 'Reset'}
              </Button>
            </Space>
          }
          size={screens.xs ? "small" : "middle"}
        >
          {["all", "completed", "hold", "override", "shiprocket"].map(tabKey => (
            <TabPane
              tab={
                <span>
                  {screens.xs ? (
                    <>
                      {tabKey === "all" && "All"}
                      {tabKey === "completed" && "Done"}
                      {tabKey === "hold" && "Hold"}
                      {tabKey === "override" && "Override"}
                      {tabKey === "shiprocket" && "SR"}
                      <span style={{ marginLeft: 4 }} className="ant-tag ant-tag-blue">
                        {getTabCount(tabKey)}
                      </span>
                    </>
                  ) : (
                    <>
                      {tabKey === "all" && "All Orders"}
                      {tabKey === "completed" && "Completed"}
                      {tabKey === "hold" && "Hold"}
                      {tabKey === "override" && "Override"}
                      {tabKey === "shiprocket" && "ShipRocket"}
                      <span style={{ marginLeft: 4 }} className="ant-tag ant-tag-blue">
                        {getTabCount(tabKey)}
                      </span>
                    </>
                  )}
                </span>
              }
              key={tabKey}
            />
          ))}
        </Tabs>
      </Card>

      <Drawer
        title="Filter ShipRocket Status"
        placement="right"
        onClose={() => setIsFilterModalVisible(false)}
        visible={isFilterModalVisible}
        width={screens.xs ? "80%" : 300}
        footer={
          <div style={{ textAlign: 'right' }}>
            <Button onClick={() => setIsFilterModalVisible(false)} style={{ marginRight: 8 }}>
              Cancel
            </Button>
            <Button type="primary" onClick={() => setIsFilterModalVisible(false)}>
              Apply
            </Button>
          </div>
        }
      >
        <Checkbox.Group
          options={shiprocketStatusOptions}
          value={shiprocketStatuses}
          onChange={handleShiprocketStatusChange}
          style={{ display: "flex", flexDirection: "column", gap: "10px" }}
        />
      </Drawer>

      <Card
  bordered={false}
  style={{
    marginBottom: 16,
    borderRight: '4px solid #3c77fa',   
    borderRadius: 8,
    overflow: 'hidden',
  }}
  bodyStyle={{
   
    padding: screens.xs ? 8 : 16,
  }}
>
  <Row gutter={[16, 16]}>

    {/* Search Input */}
    <Col xs={24} md={8}>
      <Search
        placeholder="Search orders..."
        allowClear
        enterButton={screens.xs ? false : 'Search'}
        size={screens.xs ? 'small' : 'large'}
        onSearch={handleSearch}
        value={searchText}
        onChange={(e) => handleSearch(e.target.value)}
        style={{ width: '100%' }}
      />
    </Col>

    {/* Date Range Picker */}
    <Col xs={24} md={8}>
      <Calendar
        value={dateRange}
        onChange={handleDateChange}
        selectionMode="range"
        readOnlyInput
        dateFormat="dd/mm/yy"
        placeholder="Date range"
        showIcon
        style={{
          width: '100%',
        }}
        panelStyle={{ fontSize: screens.xs ? '12px' : '14px' }}
      />
    </Col>

    {/* Export Button */}
    <Col xs={24} md={8}>
    <Select
        placeholder="Order Status"
        style={{ width: '100%' }}
        allowClear
        size={screens.xs ? 'small' : 'middle'}
      >
        <Option value="Delivered">Delivered</Option>
        <Option value="Pending">Pending</Option>
      </Select>
    </Col>

    {/* Packing Status Filter */}
    <Col xs={24} md={8}>
      <Select
        placeholder="Packing Status"
        style={{ width: '100%' }}
        onChange={handlePackingStatusChange}
        value={packingStatusFilter}
        allowClear
        size={screens.xs ? 'small' : 'middle'}
      >
        <Option value="Completed">Completed</Option>
        <Option value="Not Completed">Not Completed</Option>
      </Select>
    </Col>

    {/* Sort By */}
    <Col xs={24} md={8}>
      <Select
        placeholder="Sort By"
        style={{ width: '100%' }}
        onChange={handleSortChange}
        value={sortOrder}
        allowClear
        size={screens.xs ? 'small' : 'middle'}
      >
        <Option value="packed_asc">Packed Status (A-Z)</Option>
        <Option value="packed_desc">Packed Status (Z-A)</Option>
      </Select>
    </Col>

    {/* Placeholder or Additional Filter (6th Column) */}
    <Col xs={24} md={8}>
      {/* Example: Status Filter or Add More Controls */}
    

      <Button
        type="primary"
        icon={<DownloadOutlined />}
        onClick={handleDownloadExcel}
        disabled={!filteredOrders.length}
        block
        size={screens.xs ? 'small' : 'middle'}
      >
        Export
      </Button>

    </Col>
    
  </Row>
</Card>


      <Card
        bordered={false}
        style={{ borderRadius: 8
        }}
        bodyStyle={{ padding: 0 }}
      >
        <div style={{ padding: screens.xs ? '8px' : '16px', borderBottom: '1px solid #f0f0f0' }}>
          <Space>
            <Text strong>{filteredOrders.length} orders</Text>
            {dateRange && dateRange[0] && dateRange[1] && (
              <Text type="secondary">
                {moment(dateRange[0]).format("MMM D")} - {moment(dateRange[1]).format("MMM D, YYYY")}
              </Text>
            )}
            <Tag color="blue">Today: {todayOrdersCount}</Tag>
          </Space>
        </div>
        <Table
          components={{ header: { cell: ResizableTitle } }}
          columns={enhancedColumns}
          dataSource={filteredOrders}
          rowKey="orderID"
          pagination={{
            position: ["bottomRight"],
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} items`,
            size: screens.xs ? "small" : "default",
          }}
          bordered={false}
          size={screens.xs ? "small" : "middle"}
          expandable={{ expandedRowRender }}
          tableLayout="fixed"
          scroll={{ x: screens.xs ? undefined : 'max-content' }}
          rowClassName={rowClassName}
        />
      </Card>
    </div>
  );
};

export default OrdersPage;
