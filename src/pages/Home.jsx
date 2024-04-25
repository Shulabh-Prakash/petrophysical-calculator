import React, { useState } from "react";
import AWS from "../AWSconfig";
import axios from "axios";

const downloadFileUsingAnchor = (fileUrl, fileName) => {
  const link = document.createElement("a");
  link.href = fileUrl;
  link.download = fileName;
  // link.target = "_blank"; // Optional: Open in a new tab
  link.click();
};

const Home = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [constants, setConstants] = useState({
    matrixDensity: "",
    fluidDensity: "",
    waterResistivity: "",
    tortuosity: "1",
    saturationExponent: "2",
    cementationExponent: "1",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setConstants((prevConstants) => ({ ...prevConstants, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.name.endsWith(".las")) {
      setSelectedFile(file);
      setErrorMessage("");
    } else {
      setSelectedFile(null);
      setErrorMessage("Please upload a .las file.");
    }
  };

  const uploadFileToS3 = async (file) => {
    const s3 = new AWS.S3();
    const params = {
      Bucket: "physicscalc", // replace with your bucket name
      Key: `input/${file.name}`,
      Body: file,
    };

    try {
      setUploading(true);
      const uploadResult = await s3.upload(params).promise();
      console.log("Upload successful:", uploadResult.Location);
      return uploadResult.Location;
    } catch (error) {
      console.error("Upload error:", error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const onFormSubmit = async (e) => {
    e.preventDefault();
    console.log(selectedFile, constants);
    if (selectedFile) {
      try {
        console.log(selectedFile.name);
        const fileUrl = await uploadFileToS3(selectedFile);
        console.log(fileUrl);
        setProcessing(true);
        const response = await axios.post(
          "http://43.204.103.44/api/v1/mloutput",
          {
            input_bucket: "physicscalc",
            input_key: `input/${selectedFile.name}`,
            output_bucket: "physicscalc",
            plots_key: `output_pdf/${selectedFile.name.slice(0, -4)}.pdf`,
            data_key: `output_xlxs/${selectedFile.name.slice(0, -4)}.xlxs`,
            bulk_density_column_name: "RHOB",
            neutron_porosity_column_name: "NPHI",
            deep_resistivity_column_name: "ILD",
            porosity_column_name: "PHI",
            water_saturation_column_name: "SW",
            density_log_porosity_column_name: "DPHI",
            permeability_column_name: "K",
            constant_matrix_density: parseFloat(constants.matrixDensity),
            constant_fluid_density: parseFloat(constants.fluidDensity),
            constant_water_resistivity: parseFloat(constants.waterResistivity),
            constant_tortuosity: parseFloat(constants.tortuosity),
            constant_saturation_exponent: parseFloat(
              constants.saturationExponent
            ),
            constant_cementation_exponent: parseFloat(
              constants.cementationExponent
            ),
          }
        );
        setResult(response.data);
      } catch (error) {
        console.error("Upload error:", error);
      } finally {
        setProcessing(false);
      }
    } else {
      setErrorMessage("Please select a file to upload.");
    }
  };

  const getPresignedUrl = async (key) => {
    const s3 = new AWS.S3();
    const params = {
      Bucket: "physicscalc", // replace with your bucket name
      Key: key, // specify the object key (path and filename)
      Expires: 120, // link expiration time in seconds (e.g., 60 seconds)
    };
    try {
      const url = await s3.getSignedUrlPromise("getObject", params);
      return url;
    } catch (error) {
      console.error("Error generating pre-signed URL:", error);
      throw error;
    }
  };
  const downloadPrivateFile = async (key, fileName) => {
    let pdf_filename = `${selectedFile.name.slice(0, -4)}.pdf`;
    let xlxs_filename = `${selectedFile.name.slice(0, -4)}.xlxs`;
    let pdf_key = `output_pdf/${pdf_filename}`;
    let xlxs_key = `output_xlxs/${xlxs_filename}`;

    try {
      const pdf_fileUrl = await getPresignedUrl(pdf_key);
      const xlxs_fileUrl = await getPresignedUrl(xlxs_key);
      // Using fetch API
      downloadFileUsingAnchor(pdf_fileUrl, pdf_filename);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      downloadFileUsingAnchor(xlxs_fileUrl, xlxs_filename);

      // Using dynamic anchor element
      // downloadFileUsingAnchor(fileUrl, fileName);
    } catch (error) {
      console.error("Error downloading file:", error);
    }
  };
  return (
    <div>
      <h2>Petrophysical Calculator</h2>
      <form onSubmit={onFormSubmit}>
        <div>
          <h3>Upload Log File</h3>
          <input
            type="file"
            accept=".las"
            onChange={handleFileChange}
            style={{
              padding: "10px",
              fontSize: "16px",
              border: "1px solid #ccc",
              borderRadius: "4px",
              marginTop: "10px",
              width: "100%",
            }}
          />
          {errorMessage && (
            <p
              style={{
                color: "red",
                marginTop: "5px",
                fontSize: "14px",
              }}
            >
              {errorMessage}
            </p>
          )}
        </div>
        <div style={{ textAlign: "center" }}>
          <h3>Enter All Required Constants</h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "30px",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {Object.entries(constants).map(([key, value]) => (
              <div key={key} style={{ textAlign: "left" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "5px",
                    fontSize: "16px",
                    fontWeight: "bold",
                  }}
                >
                  <span>
                    {key.charAt(0).toUpperCase() +
                      key
                        .slice(1)
                        .replace(/([A-Z])/g, " $1")
                        .trim()}
                  </span>

                  <input
                    type="number"
                    name={key}
                    value={value}
                    onChange={handleChange}
                    required
                    style={{
                      display: "block",
                      width: "100%",
                      padding: "8px",
                      fontSize: "14px",
                      borderRadius: "4px",
                      border: "1px solid #ccc",
                      marginTop: "10px",
                    }}
                  />
                </label>
              </div>
            ))}
          </div>
        </div>
        {!result ? (
          <button
            type="submit"
            style={{
              backgroundColor: "#fff",
              color: "#000",
              padding: "10px 20px",
              fontSize: "16px",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              transition: "background-color 0.3s ease",
              marginTop: "20px",
              boxShadow: "0 4px 6px rgba(0, 123, 255, 0.1)",
            }}
          >
            {uploading
              ? "Uploading File..."
              : processing
              ? "Procesing file..."
              : "Calculate"}
          </button>
        ) : (
          <>
            <button
              style={{
                backgroundColor: "green",
                color: "#fff",
                padding: "10px 20px",
                fontSize: "16px",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                transition: "background-color 0.3s ease",
                marginTop: "20px",
                boxShadow: "0 4px 6px rgba(0, 123, 255, 0.1)",
                marginRight: "12px",
              }}
              onClick={downloadPrivateFile}
            >
              Download
            </button>
            <button
              style={{
                backgroundColor: "red",
                color: "#fff",
                padding: "10px 20px",
                fontSize: "16px",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                transition: "background-color 0.3s ease",
                marginTop: "20px",
                boxShadow: "0 4px 6px rgba(0, 123, 255, 0.1)",
              }}
              onClick={() => {
                setResult(null);
                setConstants({
                  matrixDensity: "",
                  fluidDensity: "",
                  waterResistivity: "",
                  tortuosity: "1",
                  saturationExponent: "2",
                  cementationExponent: "1",
                });
              }}
            >
              Reset
            </button>
          </>
        )}
      </form>
    </div>
  );
};

export default Home;
