import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Card,
  Typography,
  Table,
  Tag,
  Input,
  Select,
  Collapse,
  Statistic,
  Row,
  Col,
  Badge,
  Spin,
  Button,
} from "antd";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title as ChartTitle,
  Tooltip,
  Legend,
} from "chart.js";
import config from "../config"; // Import the config file
import Cookies from "js-cookie"; // Import js-cookie to match PickingPage.js

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;
const { Panel } = Collapse;

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ChartTitle,
  Tooltip,
  Legend
);

const UserPerformancePage = () => {
  const [userPerformanceData, setUserPerformanceData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [pickingActivities, setPickingActivities] = useState([]);
  const [orders, setOrders] = useState([]);
  const [overriddenOrders, setOverriddenOrders] = useState([]);
  const [activePickers, setActivePickers] = useState([]);
  const [selectedPicker, setSelectedPicker] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Fetch user performance, picking activities, orders, and overridden orders
  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch packing performance data
      const performanceResponse = await axios.get(`${config.apiBaseUrl}/user-performance`, {
        headers: { Authorization: `Bearer ${Cookies.get("token")}` },
      });
      const performanceData = performanceResponse.data.map((item) => ({
        ...item,
        packingTime: item.endTime
          ? (new Date(item.endTime) - new Date(item.startTime)) / 1000 / 60 // Minutes
          : null,
        errorRate: item.products.reduce(
          (acc, p) => acc + (p.quantity !== p.scannedQuantity ? 1 : 0),
          0
        ),
      }));
      setUserPerformanceData(performanceData);
      setFilteredData(performanceData);

      // Fetch picking activities
      const pickingResponse = await axios.get(`${config.apiBaseUrl}/picking-activities`, {
        headers: { Authorization: `Bearer ${Cookies.get("token")}` },
      });
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const todayActivities = pickingResponse.data.filter(
        (activity) =>
          new Date(activity.startTime) >= today && new Date(activity.startTime) < tomorrow
      );
      setPickingActivities(todayActivities);

      // Fetch overridden orders
      const overriddenResponse = await axios.get(`${config.apiBaseUrl}/overridden-orders/today`, {
        headers: { Authorization: `Bearer ${Cookies.get("token")}` },
      });
      const overriddenData = Array.isArray(overriddenResponse.data) ? overriddenResponse.data : [];
      console.log("Raw Overridden Orders Data:", overriddenResponse.data);

      // Flatten the orders array and add fallback values
      const flattenedOrders = overriddenData.flatMap(item =>
        (item.orders || []).map(order => ({
          user: item.user || "Unknown",
          orderId: order.orderId || "N/A",
          status: order.status || "N/A",
          reason: order.reason || "N/A",
          createdAt: order.createdAt || null,
          products: order.products || [],
          _id: order._id || crypto.randomUUID(),
        }))
      );
      setOverriddenOrders(flattenedOrders);

      // Fetch all orders
      const ordersResponse = await axios.get(`${config.apiBaseUrl}/all-orders`, {
        headers: { Authorization: `Bearer ${Cookies.get("token")}` },
      });
      const todayOrders = ordersResponse.data.filter(
        (order) =>
          new Date(order.createdAt || order.startTime) >= today &&
          new Date(order.createdAt || order.startTime) < tomorrow
      );
      setOrders(todayOrders);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Real-time updates using WebSocket
  useEffect(() => {
    fetchData();

    const ws = new WebSocket(config.websocketUrl);
    ws.onmessage = (event) => {
      const updatedData = JSON.parse(event.data);
      if (updatedData.type === "performance") {
        setUserPerformanceData((prev) => {
          const newData = [...prev, ...updatedData.data].reduce((acc, curr) => {
            acc[curr._id] = curr;
            return acc;
          }, {});
          return Object.values(newData);
        });
      } else if (updatedData.type === "picking") {
        setPickingActivities((prev) => {
          const newData = [...prev, ...updatedData.data].reduce((acc, curr) => {
            acc[curr._id] = curr;
            return acc;
          }, {});
          return Object.values(newData).filter(
            (activity) =>
              new Date(activity.startTime) >= new Date().setHours(0, 0, 0, 0) &&
              new Date(activity.startTime) < new Date(new Date().setDate(new Date().getDate() + 1)).setHours(0, 0, 0, 0)
          );
        });
      } else if (updatedData.type === "orders") {
        setOrders((prev) => {
          const newData = [...prev, ...updatedData.data].reduce((acc, curr) => {
            acc[curr._id] = curr;
            return acc;
          }, {});
          return Object.values(newData).filter(
            (order) =>
              new Date(order.createdAt || order.startTime) >= new Date().setHours(0, 0, 0, 0) &&
              new Date(order.createdAt || order.startTime) < new Date(new Date().setDate(new Date().getDate() + 1)).setHours(0, 0, 0, 0)
          );
        });
      } else if (updatedData.type === "overridden") {
        setOverriddenOrders((prev) => {
          const newData = [...prev, ...updatedData.data].reduce((acc, curr) => {
            acc[curr._id] = curr;
            return acc;
          }, {});
          return Object.values(newData);
        });
      }
    };

    return () => ws.close();
  }, []);

  // Filter and search logic for packing data
  useEffect(() => {
    let filtered = userPerformanceData;
    if (searchTerm) {
      filtered = filtered.filter((item) =>
        item.user.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (statusFilter !== "all") {
      filtered = filtered.filter((item) =>
        statusFilter === "active"
          ? item.endTime === null
          : item.endTime !== null
      );
    }
    setFilteredData(filtered);
  }, [searchTerm, statusFilter, userPerformanceData]);

  // Get active pickers
  useEffect(() => {
    const uniquePickers = [...new Set(pickingActivities.map((activity) => activity.username))];
    setActivePickers(uniquePickers);

    if (!selectedPicker && uniquePickers.length > 0) {
      setSelectedPicker(uniquePickers[0]);
    }
  }, [pickingActivities]);

  // Auto-select the first order if none is selected
  useEffect(() => {
    if (!selectedOrder && orders.length > 0) {
      setSelectedOrder(orders[0]._id);
    }
  }, [orders]);

  // Group data by user for packing summary
  const userSummary = filteredData.reduce((acc, item) => {
    if (!acc[item.user]) {
      acc[item.user] = {
        orders: 0,
        totalPackingTime: 0,
        errors: 0,
        active: false,
      };
    }
    acc[item.user].orders += 1;
    acc[item.user].totalPackingTime += item.packingTime || 0;
    acc[item.user].errors += item.errorRate || 0;
    acc[item.user].active = acc[item.user].active || !item.endTime;
    return acc;
  }, {});

  // Chart data for packing performance trends
  const chartData = {
    labels: Object.keys(userSummary),
    datasets: [
      {
        label: "Orders Packed",
        data: Object.values(userSummary).map((u) => u.orders),
        borderColor: "rgba(75, 192, 192, 1)",
        backgroundColor: "rgba(75, 192, 192, 0.2)",
      },
      {
        label: "Avg Packing Time (min)",
        data: Object.values(userSummary).map((u) =>
          u.orders ? (u.totalPackingTime / u.orders).toFixed(2) : 0
        ),
        borderColor: "rgba(255, 99, 132, 1)",
        backgroundColor: "rgba(255, 99, 132, 0.2)",
      },
    ],
  };

  // Table columns for packing performance
  const packingColumns = [
    {
      title: "Order ID",
      dataIndex: "orderId",
      key: "orderId",
    },
    {
      title: "Start Time",
      dataIndex: "startTime",
      key: "startTime",
      render: (text) => new Date(text).toLocaleString(),
    },
    {
      title: "End Time",
      dataIndex: "endTime",
      key: "endTime",
      render: (text) => (text ? new Date(text).toLocaleString() : "In Progress"),
    },
    {
      title: "Packing Time (min)",
      dataIndex: "packingTime",
      key: "packingTime",
      render: (time) => (time ? time.toFixed(2) : "N/A"),
    },
    {
      title: "Hold Reason",
      dataIndex: "holdReason",
      key: "holdReason",
      render: (text) => (text ? <Tag color="red">{text}</Tag> : <Tag color="green">N/A</Tag>),
    },
    {
      title: "Errors",
      dataIndex: "errorRate",
      key: "errorRate",
      render: (errors) => (errors > 0 ? <Tag color="orange">{errors}</Tag> : <Tag color="blue">0</Tag>),
    },
  ];

  // Table columns for picking activities
  const pickingColumns = [
    {
      title: "Order ID",
      dataIndex: "orderID",
      key: "orderID",
    },
    {
      title: "Start Time",
      dataIndex: "startTime",
      key: "startTime",
      render: (text) => new Date(text).toLocaleString(),
    },
    {
      title: "End Time",
      dataIndex: "endTime",
      key: "endTime",
      render: (text) => new Date(text).toLocaleString(),
    },
  ];

  // Table columns for orders
  const orderColumns = [
    {
      title: "Order ID",
      dataIndex: "_id",
      key: "_id",
    },
    {
      title: "Created At",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (text) => new Date(text).toLocaleString(),
    },
    {
      title: "Status",
      dataIndex: "picked_status",
      key: "picked_status",
      render: (text) => (text ? <Tag color="blue">{text}</Tag> : <Tag color="red">Not Picked</Tag>),
    },
  ];

  // Table columns for overridden orders
  const overriddenColumns = [
    {
      title: "Order ID",
      dataIndex: "orderId",
      key: "orderId",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (text) => <Tag color="orange">{text}</Tag>,
    },
    {
      title: "Reason",
      dataIndex: "reason",
      key: "reason",
      render: (text) => <Tag color="red">{text}</Tag>,
    },
    {
      title: "Created At",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (text) => {
        return text ? new Date(text).toLocaleString("en-US", { timeZone: "UTC" }) : "N/A";
      },
    },
  ];

  // Sub-table columns for expandable product list
  const productColumns = [
    {
      title: "Product Name",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "SKU",
      dataIndex: "sku",
      key: "sku",
      render: (text) => text || "N/A",
    },
    {
      title: "Quantity",
      dataIndex: "quantity",
      key: "quantity",
    },
  ];

  // Calculate picker stats
  const getPickerStats = (picker) => {
    const pickerActivities = pickingActivities.filter((activity) => activity.username === picker);
    const ordersPicked = pickerActivities.length;
    const totalOrders = orders.length;
    const ordersNotPicked = orders.filter(
      (order) => !order.picked_status || order.picked_status === "Not Picked"
    ).length;

    return {
      ordersPicked,
      ordersLeft: ordersNotPicked,
      totalOrders,
    };
  };

  // Calculate order stats
  const getOrderStats = () => {
    const totalOrders = orders.length;
    const pickedOrders = orders.filter(
      (order) => order.picked_status && order.picked_status !== "Not Picked"
    ).length;
    const ordersNotPicked = totalOrders - pickedOrders;

    return {
      totalOrders,
      pickedOrders,
      ordersNotPicked,
    };
  };

  return (
    <div style={{ padding: "20px" }}>
      <Title level={2}>User Performance Dashboard</Title>

      <Spin spinning={loading}>
        {/* Summary Statistics */}
        <Row gutter={16} style={{ marginBottom: "20px" }}>
          <Col span={6}>
            <Statistic title="Total Users" value={Object.keys(userSummary).length} />
          </Col>
          <Col span={6}>
            <Statistic title="Total Orders" value={filteredData.length} />
          </Col>
          <Col span={6}>
            <Statistic
              title="Active Users"
              value={Object.values(userSummary).filter((u) => u.active).length}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Total Errors"
              value={Object.values(userSummary).reduce((acc, u) => acc + u.errors, 0)}
            />
          </Col>
        </Row>

        {/* Filters for Packing Data */}
        <Row gutter={16} style={{ marginBottom: "20px" }}>
          <Col span={12}>
            <Search
              placeholder="Search by user"
              onSearch={(value) => setSearchTerm(value)}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: "100%" }}
            />
          </Col>
          <Col span={12}>
            <Select
              defaultValue="all"
              style={{ width: "100%" }}
              onChange={(value) => setStatusFilter(value)}
            >
              <Option value="all">All</Option>
              <Option value="active">Active</Option>
              <Option value="completed">Completed</Option>
            </Select>
          </Col>
        </Row>

        {/* Split View for Picking Activity */}
        <Row gutter={16} style={{ marginBottom: "20px" }}>
          <Col span={6}>
            <Card title="Active Pickers (Today)" style={{ height: "100%" }}>
              <Row gutter={[16, 16]}>
                {activePickers.length > 0 ? (
                  activePickers.map((picker) => (
                    <Col span={24} key={picker}>
                      <Button
                        type={selectedPicker === picker ? "primary" : "default"}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          padding: "8px",
                        }}
                        onClick={() => setSelectedPicker(picker)}
                      >
                        {picker}
                      </Button>
                    </Col>
                  ))
                ) : (
                  <Col span={24}>
                    <Typography.Text>No active pickers today</Typography.Text>
                  </Col>
                )}
              </Row>
            </Card>
          </Col>

          <Col span={18}>
            {selectedPicker ? (
              <Card title={`Picked Orders by ${selectedPicker} (Today)`}>
                <Row gutter={16} style={{ marginBottom: "16px" }}>
                  <Col span={8}>
                    <Statistic
                      title="Picked Orders"
                      value={
                        pickingActivities.filter(
                          (activity) => activity.username === selectedPicker
                        ).length
                      }
                    />
                  </Col>
                </Row>
                <Table
                  columns={pickingColumns}
                  dataSource={pickingActivities
                    .filter((activity) => activity.username === selectedPicker)
                    .map((activity) => ({ ...activity, key: activity._id }))}
                  expandable={{
                    expandedRowRender: (record) => (
                      <Table
                        columns={productColumns}
                        dataSource={record.products.map((product, index) => ({
                          ...product,
                          key: index,
                        }))}
                        pagination={false}
                        size="small"
                      />
                    ),
                    rowExpandable: (record) => record.products && record.products.length > 0,
                  }}
                  pagination={{ pageSize: 5 }}
                  rowKey="key"
                  locale={{ emptyText: "No orders picked today" }}
                />
              </Card>
            ) : (
              <Card>
                <Typography.Text>Select a picker to view details</Typography.Text>
              </Card>
            )}
          </Col>
        </Row>

        {/* Overridden Orders Section */}
        <Row gutter={16} style={{ marginBottom: "20px" }}>
          <Col span={6}>
            <Card title="Users with Overridden Orders (Today)" style={{ height: "100%" }}>
              <Row gutter={[16, 16]}>
                {Object.keys(
                  overriddenOrders.reduce((acc, order) => {
                    acc[order.user] = true;
                    return acc;
                  }, {})
                ).length > 0 ? (
                  Object.keys(
                    overriddenOrders.reduce((acc, order) => {
                      acc[order.user] = true;
                      return acc;
                    }, {})
                  ).map((user) => (
                    <Col span={24} key={user}>
                      <Button
                        type={selectedPicker === user ? "primary" : "default"}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          padding: "8px",
                        }}
                        onClick={() => setSelectedPicker(user)}
                      >
                        {user}
                      </Button>
                    </Col>
                  ))
                ) : (
                  <Col span={24}>
                    <Typography.Text>No users with overridden orders today</Typography.Text>
                  </Col>
                )}
              </Row>
            </Card>
          </Col>

          <Col span={18}>
            {selectedPicker ? (
              <Card title={`Overridden Orders by ${selectedPicker}`}>
                {(() => {
                  const userOverriddenOrders = overriddenOrders.filter(
                    (order) => order.user === selectedPicker
                  );
                  return (
                    <>
                      <Row gutter={16} style={{ marginBottom: "16px" }}>
                        <Col span={8}>
                          <Statistic
                            title="Overridden Orders"
                            value={userOverriddenOrders.length}
                          />
                        </Col>
                      </Row>
                      <Table
                        columns={overriddenColumns}
                        dataSource={userOverriddenOrders.map((order, index) => ({
                          ...order,
                          key: order._id || index,
                        }))}
                        expandable={{
                          expandedRowRender: (record) => (
                            <Table
                              columns={[
                                {
                                  title: "Product Name",
                                  dataIndex: "name",
                                  key: "name",
                                },
                                {
                                  title: "Quantity",
                                  dataIndex: "quantity",
                                  key: "quantity",
                                },
                                {
                                  title: "Scanned Quantity",
                                  dataIndex: "scannedQuantity",
                                  key: "scannedQuantity",
                                },
                              ]}
                              dataSource={record.products.map((product, index) => ({
                                ...product,
                                key: index,
                              }))}
                              pagination={false}
                              size="small"
                            />
                          ),
                          rowExpandable: (record) =>
                            record.products && record.products.length > 0,
                        }}
                        pagination={{ pageSize: 5, showSizeChanger: false }}
                        rowKey="key"
                        locale={{ emptyText: "No overridden orders for this user" }}
                      />
                    </>
                  );
                })()}
              </Card>
            ) : (
              <Card>
                <Typography.Text>Select a user to view overridden orders</Typography.Text>
              </Card>
            )}
          </Col>
        </Row>

        {/* Packing Performance Collapse for Today's Data */}
        <Collapse>
          {Object.keys(userSummary).map((user) => {
            // Filter today's data for the specific user
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const userTodayData = filteredData.filter(
              (item) =>
                item.user === user &&
                new Date(item.startTime) >= today &&
                new Date(item.startTime) < tomorrow
            );

            // Skip rendering if no data for today
            if (userTodayData.length === 0) return null;

            return (
              <Panel
                header={
                  <span>
                    {user}{" "}
                    {userSummary[user].active ? (
                      <Badge status="processing" text="Active" />
                    ) : (
                      <Badge status="default" text="Inactive" />
                    )}
                    <span style={{ marginLeft: "10px" }}>
                      (Today's Orders: {userTodayData.length})
                    </span>
                  </span>
                }
                key={user}
              >
                <Table
                  dataSource={userTodayData}
                  columns={packingColumns}
                  rowKey={(record) => record._id}
                  pagination={false}
                />
              </Panel>
            );
          })}
        </Collapse>
      </Spin>
    </div>
  );
};

export default UserPerformancePage;
