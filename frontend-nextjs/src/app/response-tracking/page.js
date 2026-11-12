
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getRFQs } from "@/lib/api";

export default function ResponseTrackingPage() {
  const [rfqs, setRfqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");


  useEffect(() => {
    async function loadRFQs() {
      try {
        const token = localStorage.getItem("adminToken");

        if (!token) {
          setError("Administrator login required. Please sign in through the Admin Dashboard.");
          return;
        }

        const result = await getRFQs(token);
        setRfqs(result.rfqs || []);
      } catch (err) {
        setError(err.message || "Unable to load RFQ responses.");
      } finally {
        setLoading(false);
      }
    }

    loadRFQs();
  }, []);


  const total = rfqs.length;

  const sent = rfqs.filter((rfq) => rfq.status === "Sent").length;
  const completed = rfqs.filter(
    (rfq) => rfq.status === "Completed"
  ).length;

  const cancelled = rfqs.filter(
    (rfq) => rfq.status === "Cancelled"
  ).length;

  return (
    <main className="tracking-page">
      <header className="page-heading">
        <div>
          <Link href="/" className="back-link">
            ← Dashboard
          </Link>
          <p className="eyebrow">PROCUREMENT WORKSPACE</p>
          <h1>Response Tracking</h1>
          <p className="subtitle">
            Monitor supplier responses and RFQ progress.
          </p>
        </div>

        <Link href="/rfq" className="primary-button">
          Manage RFQs →
        </Link>
      </header>

      {loading ? (
        <p className="message">Loading supplier responses...</p>
      ) : error ? (
        <p className="error">{error}</p>
      ) : (
        <>
          <section className="stats-grid">
            <div className="stat-card">
              <span>Total RFQs</span>
              <strong>{total}</strong>
            </div>

            <div className="stat-card">
              <span>Awaiting Responses</span>
              <strong>{sent}</strong>
            </div>

            <div className="stat-card">
              <span>Completed RFQs</span>
              <strong>{completed}</strong>
            </div>

            <div className="stat-card">
              <span>Cancelled RFQs</span>
              <strong>{cancelled}</strong>
            </div>
          </section>

          <section className="tracking-section">
            <div className="section-heading">
              <div>
                <h2>RFQ Response Overview</h2>
                <p>Supplier response progress for each RFQ.</p>
              </div>
              <span>{total} RFQs</span>
            </div>

            {rfqs.length === 0 ? (
              <div className="empty-state">
                <h3>No RFQs found</h3>
                <p>Create an RFQ to start tracking supplier responses.</p>
                <Link href="/rfq" className="primary-button">
                  Create an RFQ
                </Link>
              </div>
            ) : (
              <div className="rfq-list">
                {rfqs.map((rfq) => {
                  const quotations = rfq.quotations || [];

                  const submitted = quotations.filter(
                    (q) => q.status === "Submitted"
                  ).length;

                  const declined = quotations.filter(
                    (q) => q.status === "Declined"
                  ).length;

                  const pending = quotations.filter(
                    (q) => q.status === "Pending"
                  ).length;

                  const totalSuppliers = quotations.length;

                  const progress = totalSuppliers
                    ? Math.round(
                        ((submitted + declined) / totalSuppliers) * 100
                      )
                    : 0;

                  return (
                    <article className="rfq-card" key={rfq._id}>
                      <div className="rfq-top">
                        <div>
                          <h3>{rfq.title}</h3>
                          <p>
                            Project:{" "}
                            {rfq.project?.productName || "Project unavailable"}
                          </p>
                        </div>

                        <span
                          className={`status status-${(
                            rfq.status || "Draft"
                          ).toLowerCase()}`}
                        >
                          {rfq.status || "Draft"}
                        </span>
                      </div>

                      <div className="response-stats">
                        <div>
                          <strong>{totalSuppliers}</strong>
                          <span>Suppliers</span>
                        </div>

                        <div>
                          <strong>{submitted}</strong>
                          <span>Submitted</span>
                        </div>

                        <div>
                          <strong>{pending}</strong>
                          <span>Pending</span>
                        </div>

                        <div>
                          <strong>{declined}</strong>
                          <span>Declined</span>
                        </div>
                      </div>

                      <div className="progress-heading">
                        <span>Response progress</span>
                        <strong>{progress}%</strong>
                      </div>

                      <div className="progress-track">
                        <div
                          className="progress-fill"
                          style={{ width: `${progress}%` }}
                        />
                      </div>

                      <div className="rfq-bottom">
                        <span>
                          Quantity: {rfq.quantity ?? "—"}
                        </span>

                        <Link href={`/rfq?rfqId=${rfq._id}`}>
                          View RFQ and responses →
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}

      <style jsx>{`
        .tracking-page {
          min-height: 100vh;
          padding: 32px;
          background: #07111f;
          color: #e8eef8;
        }

        .page-heading {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          margin-bottom: 30px;
        }

        .back-link {
          color: #91a5bf;
          text-decoration: none;
          font-size: 13px;
        }

        .eyebrow {
          color: #65a4ff;
          font-size: 11px;
          letter-spacing: 2px;
          margin-top: 22px;
        }

        h1 {
          margin: 8px 0;
          font-size: 30px;
        }

        .subtitle,
        .section-heading p,
        .rfq-top p {
          color: #91a5bf;
          font-size: 13px;
        }

        .primary-button {
          background: #2563eb;
          color: white;
          padding: 11px 16px;
          border-radius: 7px;
          text-decoration: none;
          font-size: 13px;
          font-weight: 600;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 28px;
        }

        .stat-card,
        .tracking-section,
        .rfq-card {
          background: #0b1525;
          border: 1px solid #263851;
          border-radius: 9px;
        }

        .stat-card {
          padding: 20px;
        }

        .stat-card span,
        .response-stats span {
          display: block;
          color: #91a5bf;
          font-size: 12px;
        }

        .stat-card strong {
          display: block;
          font-size: 27px;
          margin-top: 12px;
        }

        .tracking-section {
          padding: 22px;
        }

        .section-heading,
        .rfq-top,
        .rfq-bottom,
        .progress-heading {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
        }

        .section-heading {
          margin-bottom: 20px;
        }

        .section-heading h2 {
          font-size: 18px;
          margin: 0;
        }

        .section-heading > span {
          color: #91a5bf;
          font-size: 12px;
        }

        .rfq-list {
          display: grid;
          gap: 15px;
        }

        .rfq-card {
          padding: 19px;
        }

        .rfq-top h3 {
          margin: 0 0 7px;
          font-size: 16px;
        }

        .rfq-top p {
          margin: 0;
        }

        .status {
          padding: 6px 10px;
          border-radius: 20px;
          font-size: 11px;
          background: #25344a;
        }

        .status-completed {
          background: #12372e;
          color: #8de4bd;
        }

        .status-sent {
          background: #352b16;
          color: #f4cb78;
        }

        .status-cancelled {
          background: #3a2028;
          color: #f3a4b3;
        }

        .response-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin: 22px 0;
        }

        .response-stats strong {
          display: block;
          font-size: 20px;
          margin-bottom: 5px;
        }

        .progress-heading {
          font-size: 12px;
          margin-bottom: 9px;
        }

        .progress-heading span {
          color: #91a5bf;
        }

        .progress-track {
          height: 7px;
          background: #263851;
          border-radius: 10px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: #20b77a;
          border-radius: 10px;
        }

        .rfq-bottom {
          margin-top: 17px;
          font-size: 12px;
          color: #91a5bf;
        }

        .rfq-bottom a {
          color: #75aaff;
          text-decoration: none;
        }

        .empty-state,
        .message {
          padding: 35px;
          text-align: center;
          color: #91a5bf;
        }

        .empty-state .primary-button {
          display: inline-block;
          margin-top: 12px;
        }

        .error {
          color: #ff9292;
          padding: 20px;
        }

        @media (max-width: 750px) {
          .tracking-page {
            padding: 18px;
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .page-heading {
            align-items: flex-start;
            flex-direction: column;
          }

          .response-stats {
            grid-template-columns: repeat(2, 1fr);
          }

          .rfq-bottom {
            align-items: flex-start;
            flex-direction: column;
          }

          .rfq-top {
            align-items: flex-start;
          }
        }
      `}</style>
    </main>
  );
}
