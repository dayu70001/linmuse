insert into public.site_images (key, label, section, image_url, alt_text, sort_order) values
('customer_feedback_01', 'Feedback 01', 'Customer Feedback Gallery', null, 'Buyer feedback with private details hidden', 50),
('customer_feedback_02', 'Feedback 02', 'Customer Feedback Gallery', null, 'Buyer feedback with private details hidden', 51),
('customer_feedback_03', 'Feedback 03', 'Customer Feedback Gallery', null, 'Buyer feedback with private details hidden', 52),
('customer_feedback_04', 'Feedback 04', 'Customer Feedback Gallery', null, 'Buyer feedback with private details hidden', 53),
('customer_feedback_05', 'Feedback 05', 'Customer Feedback Gallery', null, 'Buyer feedback with private details hidden', 54),
('customer_feedback_06', 'Feedback 06', 'Customer Feedback Gallery', null, 'Buyer feedback with private details hidden', 55)
on conflict (key) do nothing;
