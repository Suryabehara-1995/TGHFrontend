import React, { useState, useEffect } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import {
  Table,
  Button,
  Input,
  Space,
  Card,
  Upload,
  message,
  Image,
} from "antd";
import {
  DeleteOutlined,
  PlusOutlined,
  UploadOutlined,
  EditOutlined,
  SaveOutlined,
  DownloadOutlined,
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

  const generateSampleExcel = () => {
    const sampleData = [
      {
        productID: "PROD001",
        productName: "Sample Product",
        updatedID: "NEW001",
        sku: "SKU001",
        productLocation: "Warehouse A",
        productCategory: "Electronics",
        imageUrl: "https://www.example.com/image.jpg",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sample");
    XLSX.writeFile(workbook, "sample_product_upload.xlsx");
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
        updatedID: row["updatedID"]?.toString() || "",
        sku: row["sku"] || "",
        productLocation: row["productLocation"] || "",
        productCategory: row["productCategory"] || "",
        imageUrl: row["imageUrl"] || "",
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
    setProductUpdates([
      ...productUpdates,
      {
        productID: "",
        updatedID: "",
        productName: "",
        sku: "",
        productLocation: "",
        productCategory: "",
        imageUrl: "",
      },
    ]);
  };

  const handleRemoveRow = (index) => {
    const updates = [...productUpdates];
    updates.splice(index, 1);
    setProductUpdates(updates);
  };

  const handleSubmit = async () => {
    const hasEmptyFields = productUpdates.some(
      (update) =>
        !update.productID ||
        !update.productName ||
        !update.updatedID ||
        !update.sku ||
        !update.productLocation ||
        !update.productCategory
    );

    if (hasEmptyFields) {
      messageApi.error("Please fill all required fields before submitting.");
      return;
    }

    try {
      const response = await axios.post(`${config.apiBaseUrl}/update-product-ids`, {
        productUpdates,
      });
      messageApi.success(response.data.message);
      fetchPreviousProducts();
      setProductUpdates([]);
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
      [
        product.productName,
        product.productID,
        product.updatedID,
        product.sku,
        product.productLocation,
        product.productCategory,
        product.imageUrl,
      ].some((field) => field?.toLowerCase().includes(value))
    );
    setFilteredProducts(filtered);
  };

  const updateColumns = [
    {
      title: "Product ID",
      dataIndex: "productID",
      render: (text, record, index) => (
        <Input
          value={text}
          onChange={(e) => handleInputChange(index, "productID", e.target.value)}
          style={{ width: "100%" }}
        />
      ),
    },
    {
      title: "Product Name",
      dataIndex: "productName",
      render: (text, record, index) => (
        <Input
          value={text}
          onChange={(e) => handleInputChange(index, "productName", e.target.value)}
          style={{ width: "100%" }}
        />
      ),
    },
    {
      title: "Updated ID",
      dataIndex: "updatedID",
      render: (text, record, index) => (
        <Input
          value={text}
          onChange={(e) => handleInputChange(index, "updatedID", e.target.value)}
          style={{ width: "100%" }}
        />
      ),
    },
    {
      title: "SKU",
      dataIndex: "sku",
      render: (text, record, index) => (
        <Input
          value={text}
          onChange={(e) => handleInputChange(index, "sku", e.target.value)}
          style={{ width: "100%" }}
        />
      ),
    },
    {
      title: "Location",
      dataIndex: "productLocation",
      render: (text, record, index) => (
        <Input
          value={text}
          onChange={(e) => handleInputChange(index, "productLocation", e.target.value)}
          style={{ width: "100%" }}
        />
      ),
    },
    {
      title: "Category",
      dataIndex: "productCategory",
      render: (text, record, index) => (
        <Input
          value={text}
          onChange={(e) => handleInputChange(index, "productCategory", e.target.value)}
          style={{ width: "100%" }}
        />
      ),
    },
    {
      title: "Image URL",
      dataIndex: "imageUrl",
      render: (text, record, index) => (
        <Input
          value={text}
          onChange={(e) => handleInputChange(index, "imageUrl", e.target.value)}
          style={{ width: "100%" }}
        />
      ),
    },
    {
      title: "Action",
      render: (_, __, index) => (
        <Button
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleRemoveRow(index)}
          style={{ width: "100%" }}
        >
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
      title: "Image",
      dataIndex: "imageUrl",
      render: (text) =>
        text ? (
          <Image
            src={text}
            alt="Product"
            width={50}
            height={50}
            style={{ objectFit: "cover" }}
            preview={true}
            fallback="https://via.placeholder.com/50"
          />
        ) : (
          "No Image"
        ),
      width: 100,
    },
    {
      title: "Product Name",
      dataIndex: "productName",
      render: (text, record, index) =>
        editingIndex === index ? (
          <Input
            value={text}
            onChange={(e) =>
              handleInputChange(index, "productName", e.target.value, "previous")
            }
            style={{ width: "100%" }}
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
            onChange={(e) =>
              handleInputChange(index, "productID", e.target.value, "previous")
            }
            style={{ width: "100%" }}
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
            onChange={(e) =>
              handleInputChange(index, "updatedID", e.target.value, "previous")
            }
            style={{ width: "100%" }}
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
            onChange={(e) =>
              handleInputChange(index, "sku", e.target.value, "previous")
            }
            style={{ width: "100%" }}
          />
        ) : (
          text
        ),
    },
    {
      title: "Location",
      dataIndex: "productLocation",
      render: (text, record, index) =>
        editingIndex === index ? (
          <Input
            value={text}
            onChange={(e) =>
              handleInputChange(index, "productLocation", e.target.value, "previous")
            }
            style={{ width: "100%" }}
          />
        ) : (
          text
        ),
    },
    {
      title: "Category",
      dataIndex: "productCategory",
      render: (text, record, index) =>
        editingIndex === index ? (
          <Input
            value={text}
            onChange={(e) =>
              handleInputChange(index, "productCategory", e.target.value, "previous")
            }
            style={{ width: "100%" }}
          />
        ) : (
          text
        ),
    },
    {
      title: "Image URL",
      dataIndex: "imageUrl",
      render: (text, record, index) =>
        editingIndex === index ? (
          <Input
            value={text}
            onChange={(e) =>
              handleInputChange(index, "imageUrl", e.target.value, "previous")
            }
            style={{ width: "100%" }}
          />
        ) : (
          text || "No URL"
        ),
    },
    {
      title: "Action",
      render: (_, __, index) =>
        editingIndex === index ? (
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSaveEditedRow}
            style={{ width: "100%" }}
          >
            Save
          </Button>
        ) : (
          <Button
            icon={<EditOutlined />}
            onClick={() => setEditingIndex(index)}
            style={{ width: "100%" }}
          >
            Edit
          </Button>
        ),
    },
  ];

  return (
    <div style={{ padding: "20px",  margin: "0 auto" }}>
      {contextHolder}
      <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "20px" }}>
        Product Master
      </h1>

      <Card
        title={
          <Space style={{ marginBottom: "10px" }}>
            <Upload
              beforeUpload={handleFileUpload}
              accept=".xlsx, .xls"
              showUploadList={false}
            >
              <Button icon={<UploadOutlined />}>Upload Excel File</Button>
            </Upload>
            <Button
              icon={<DownloadOutlined />}
              onClick={generateSampleExcel}
              style={{ marginLeft: "10px" }}
            >
              Download Sample Excel
            </Button>
          </Space>
        }
        style={{ marginBottom: "20px", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}
      >
        <Card
          title="Product Updates"
          style={{ marginBottom: "20px", borderRadius: "8px" }}
        >
          {productUpdates.length > 0 ? (
            <>
              <Table
                columns={updateColumns}
                dataSource={productUpdates}
                rowKey={(record, index) => index}
                pagination={false}
                size="middle"
                bordered
                style={{ marginBottom: "15px" }}
              />
              <Space>
                <Button
                  type="dashed"
                  icon={<PlusOutlined />}
                  onClick={handleAddRow}
                  style={{ marginRight: "10px" }}
                >
                  Add Row
                </Button>
                <Button type="primary" onClick={handleSubmit}>
                  Update IDs
                </Button>
              </Space>
            </>
          ) : (
            <p style={{ padding: "15px", color: "#888" }}>
              Please upload an Excel file to display the data.
            </p>
          )}
        </Card>

        <Card
          title={
            <Input
              placeholder="Search Product Name / ID / Updated ID / SKU / Location / Category / Image URL"
              value={searchValue}
              onChange={handleSearchChange}
              style={{ width: "100%", marginBottom: "10px" }}
            />
          }
          style={{ borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}
        >
          <h4 style={{ fontSize: "18px", marginBottom: "10px" }}>Products List</h4>
          <Table
            columns={previousColumns}
            dataSource={filteredProducts}
            rowKey={(record, index) => index}
            size="small"
            pagination={false}
            scroll={{ y: 400 }}
            bordered
          />
        </Card>
      </Card>
    </div>
  );
};

export default UpdateProductIds;
