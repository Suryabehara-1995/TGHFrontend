import React, { useState, useEffect } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import {
  Table,
  Button,
  Input,
  Space,
  Row,
  Col,
  Card,
  Upload,
  message,
} from "antd";
import {
  DeleteOutlined,
  PlusOutlined,
  UploadOutlined,
  EditOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import config from "../config";

const UpdateProductIds = () => {
  const [productUpdates, setProductUpdates] = useState([]);
  const [previousProducts, setPreviousProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [searchValue, setSearchValue] = useState("");
  const [messageApi, contextHolder] = message.useMessage();

  useEffect(() => {
    fetchPreviousProducts();
  }, []);

  const fetchPreviousProducts = async () => {
    try {
      const response = await axios.get(`${config.apiBaseUrl}/get-previous-products`);
      setPreviousProducts(response.data);
      setFilteredProducts(response.data);
    } catch (error) {
      messageApi.error("Failed to fetch previous products");
      console.error("Error fetching previous products:", error);
    }
  };

  const handleFileUpload = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const formattedData = jsonData.map((row) => ({
        productID: row["productID"]?.toString() || "",
        productName: row["productName"] || "",
        updatedID: row["Updated id"]?.toString() || "",
        sku: row["sku"] || "",
      }));

      setProductUpdates(formattedData);
    };
    reader.readAsArrayBuffer(file);
    return false;
  };

  const handleInputChange = (index, field, value, type = "updates") => {
    const data = type === "updates" ? [...productUpdates] : [...filteredProducts];
    data[index][field] = value;
    type === "updates" ? setProductUpdates(data) : setFilteredProducts(data);
  };

  const handleAddRow = () => {
    setProductUpdates([...productUpdates, { productID: "", updatedID: "", productName: "", sku: "" }]);
  };

  const handleRemoveRow = (index) => {
    const updates = [...productUpdates];
    updates.splice(index, 1);
    setProductUpdates(updates);
  };

  const handleSubmit = async () => {
    const hasEmptyFields = productUpdates.some(
      (update) => !update.productID || !update.productName || !update.updatedID || !update.sku
    );

    if (hasEmptyFields) {
      messageApi.error("Please fill all fields before submitting.");
      return;
    }

    try {
      const response = await axios.post(`${config.apiBaseUrl}/update-product-ids`, {
        productUpdates,
      });
      messageApi.success(response.data.message);
      fetchPreviousProducts();
    } catch (error) {
      messageApi.error("Failed to update product IDs");
      console.error("Update Error:", error);
    }
  };

  const handleSaveEditedRow = async () => {
    try {
      const editedProduct = filteredProducts[editingIndex];
      await axios.post(`${config.apiBaseUrl}/update-product-ids`, {
        productUpdates: [editedProduct],
      });
      messageApi.success("Product updated successfully!");
      setEditingIndex(null);
      fetchPreviousProducts();
    } catch (error) {
      messageApi.error("Failed to save edited product");
      console.error("Edit Save Error:", error);
    }
  };

  const handleSearchChange = (e) => {
    const value = e.target.value.toLowerCase();
    setSearchValue(value);
    const filtered = previousProducts.filter((product) =>
      [product.productName, product.productID, product.updatedID]
        .some((field) => field?.toLowerCase().includes(value))
    );
    setFilteredProducts(filtered);
  };

  const updateColumns = [
    {
      title: "Product ID",
      dataIndex: "productID",
      render: (text, record, index) => (
        <Input value={text} onChange={(e) => handleInputChange(index, "productID", e.target.value)} />
      ),
    },
    {
      title: "Product Name",
      dataIndex: "productName",
      render: (text, record, index) => (
        <Input value={text} onChange={(e) => handleInputChange(index, "productName", e.target.value)} />
      ),
    },
    {
      title: "Updated ID",
      dataIndex: "updatedID",
      render: (text, record, index) => (
        <Input value={text} onChange={(e) => handleInputChange(index, "updatedID", e.target.value)} />
      ),
    },
    {
      title: "SKU",
      dataIndex: "sku",
      render: (text, record, index) => (
        <Input value={text} onChange={(e) => handleInputChange(index, "sku", e.target.value)} />
      ),
    },
    {
      title: "Action",
      render: (_, __, index) => (
        <Button danger icon={<DeleteOutlined />} onClick={() => handleRemoveRow(index)}>
          Remove
        </Button>
      ),
    },
  ];

  const previousColumns = [
    {
      title: "S.No",
      render: (_, __, index) => index + 1,
      width: 60,
    },
    {
      title: "Product Name",
      dataIndex: "productName",
      render: (text, record, index) =>
        editingIndex === index ? (
          <Input
            value={text}
            onChange={(e) => handleInputChange(index, "productName", e.target.value, "previous")}
          />
        ) : (
          text
        ),
    },
    {
      title: "Product ID",
      dataIndex: "productID",
      render: (text, record, index) =>
        editingIndex === index ? (
          <Input
            value={text}
            onChange={(e) => handleInputChange(index, "productID", e.target.value, "previous")}
          />
        ) : (
          text
        ),
    },
    {
      title: "Updated ID",
      dataIndex: "updatedID",
      render: (text, record, index) =>
        editingIndex === index ? (
          <Input
            value={text}
            onChange={(e) => handleInputChange(index, "updatedID", e.target.value, "previous")}
          />
        ) : (
          text
        ),
    },
    {
      title: "SKU",
      dataIndex: "sku",
      render: (text, record, index) =>
        editingIndex === index ? (
          <Input
            value={text}
            onChange={(e) => handleInputChange(index, "sku", e.target.value, "previous")}
          />
        ) : (
          text
        ),
    },
    {
      title: "Action",
      render: (_, __, index) =>
        editingIndex === index ? (
          <Button type="primary" icon={<SaveOutlined />} onClick={handleSaveEditedRow}>
            Save
          </Button>
        ) : (
          <Button icon={<EditOutlined />} onClick={() => setEditingIndex(index)}>
            Edit
          </Button>
        ),
    },
  ];

  return (
    <div style={ {padding :'15px'}} >
      {contextHolder}
      <h1>Update Product IDs</h1>

      <Upload beforeUpload={handleFileUpload} accept=".xlsx, .xls" showUploadList={false}>
        <Button icon={<UploadOutlined />}>Upload Excel File</Button>
      </Upload>

      <Row gutter={16} style={{ marginTop: 20 }}>
        <Col span={12}>
          <Card title="Product Updates">
            {productUpdates.length > 0 ? (
              <>
                <Table
                  columns={updateColumns}
                  dataSource={productUpdates}
                  rowKey={(record, index) => index}
                  pagination={false}
                  size="middle"
                />
                <Space style={{ marginTop: 10 }}>
                  <Button type="dashed" icon={<PlusOutlined />} onClick={handleAddRow}>
                    Add Row
                  </Button>
                  <Button type="primary" onClick={handleSubmit}>
                    Update IDs
                  </Button>
                </Space>
              </>
            ) : (
              <p>Please upload an Excel file to display the data.</p>
            )}
          </Card>
        </Col>

        <Col span={12}>
       
          <Card
            title={
              <Input
                placeholder="Search Product Name / Product ID / Updated ID"
                value={searchValue}
                onChange={handleSearchChange}
              />
            }
          >
             <h4>Products List </h4>
            <Table
              columns={previousColumns}
              dataSource={filteredProducts}
              rowKey={(record, index) => index}
              size="small"
              pagination={false}
              scroll={{ y: 400 }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default UpdateProductIds;
