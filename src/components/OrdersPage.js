import React, { useState } from "react";
import { Table, Input, Row, Col, Button } from "antd";
import { Resizable } from "react-resizable";
import moment from "moment";
import { ShoppingOutlined } from "@ant-design/icons"; // Import the icon
import config from "../config"; // Import the config file
const { Search } = Input;

const ResizableTitle = (props) => {
  const { onResize, width, ...restProps } = props;

  if (!width) {
    return <th {...restProps} />;
  }

  return (
    <Resizable
      width={width}
      height={0}
      handle={<span className="react-resizable-handle" onClick={(e) => e.stopPropagation()} />}
      onResize={onResize}
      draggableOpts={{ enableUserSelectHack: false }}
    >
      <th {...restProps} />
    </Resizable>
  );
};

const OrdersPage = ({ orders, columnWidths, handleResize }) => {
  const [searchText, setSearchText] = useState("");
  const [filteredOrders, setFilteredOrders] = useState(orders);

  const handleSearch = (value) => {
    setSearchText(value);
    const filteredData = orders.filter((order) => {
      const { orderID, customer } = order;
      const { name, email, mobile } = customer;
      return (
        orderID.toLowerCase().includes(value.toLowerCase()) ||
        name.toLowerCase().includes(value.toLowerCase()) ||
        email.toLowerCase().includes(value.toLowerCase()) ||
        mobile.toLowerCase().includes(value.toLowerCase())
      );
    });
    setFilteredOrders(filteredData);
  };

  const handleFilterHoldOrders = () => {
    const holdOrders = orders.filter((order) => order.packed_status === "Hold");
    setFilteredOrders(holdOrders);
  };

  const handleShowAllOrders = () => {
    setFilteredOrders(orders);
  };

  const columns = [
    {
      title: "S.No",
      key: "sno",
      width: columnWidths["sno"] || 70,
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
      width: columnWidths["customer_mobile"] || 150,
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
    },
    {
      title: "AWB Code",
      dataIndex: ["shipments", 0, "awb_code"],
      key: "awb_code",
      width: columnWidths["awb_code"] || 150,
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
            background: status === "Completed" ? "#e6ffe6" : status === "Hold" ? "#fff3e6" : "#fff3e6",
            color: status === "Completed" ? "#006600" : status === "Hold" ? "#ff9900" : "#663300",
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
      render: (text) => moment(text).format("DD-MM-YYYY"),
    },
  ];

  const expandedRowRender = (record) => {
    return (
      <div style={{ padding: "10px", background: "#fafafa" }}>
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
              title: "Product Weight",
              dataIndex: "sku",
              key: "sku",
              width: 200,
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
              title: "Packed Date",
              dataIndex: "packed_date",
              key: "packed_date",
              width: 120,
              render: (text) => (text ? moment(text).format("DD-MM-YYYY") : "N/A"),
            },
            {
              title: "Packed Time",
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
              render: (text) => (text ? moment(text).format("DD-MM-YYYY") : "N/A"),
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

  const enhancedColumns = columns.map((col, index) => ({
    ...col,
    onHeaderCell: (column) => ({
      width: column.width,
      onResize: handleResize(index),
    }),
  }));

  return (
    <div style={{ padding: "10px" }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: "20px" }}>
        <Col>
          <h3>
            <ShoppingOutlined style={{ marginLeft: "8px", color: "#1890ff" }} /> All Orders{" "}
            <span style={{ marginLeft: "4px" }}>{filteredOrders.length}</span>
          </h3>
        </Col>
        <Col>
          <Search
            placeholder="Search by Order ID, Name, Email, Phone"
            onSearch={handleSearch}
            enterButton
            value={searchText}
            onChange={(e) => handleSearch(e.target.value)}
            style={{ width: 300 }}
          />
        </Col>
        <Col>
          <Button type="primary" onClick={handleFilterHoldOrders} style={{ marginRight: "10px" }}>
            Orders on Hold ({orders.filter((order) => order.packed_status === "Hold").length})
          </Button>
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
      />
    </div>
  );
};

export default OrdersPage;