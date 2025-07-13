import Stripe from "stripe";
import { Course } from "../models/course.model.js";
import { CoursePurchase } from "../models/coursePurchase.model.js";
import { Lecture } from "../models/lecture.model.js";
import { User } from "../models/user.model.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const createCheckoutSession = async (req, res) => {
  try {
    const userId = req.id;
    const { courseId } = req.body;

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: "Course not found!" });

    // Create a new course purchase record
    const newPurchase = new CoursePurchase({
      courseId,
      userId,
      amount: course.coursePrice,
      status: "pending",
    });

    // Create a Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "inr",
            product_data: {
              name: course.courseTitle,
              images: [course.courseThumbnail],
            },
            unit_amount: course.coursePrice * 100, // Amount in paise (lowest denomination)
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `http://localhost:5173/course-progress/${courseId}`, // once payment successful redirect to course progress page
      cancel_url: `http://localhost:5173/course-detail/${courseId}`,
      metadata: {
        courseId: courseId,
        userId: userId,
      },
      shipping_address_collection: {
        allowed_countries: ["IN"], // Optionally restrict allowed countries
      },
    });

    if (!session.url) {
      return res
        .status(400)
        .json({ success: false, message: "Error while creating session" });
    }

    // Save the purchase record
    newPurchase.paymentId = session.id;
    await newPurchase.save();

    return res.status(200).json({
      success: true,
      url: session.url, // Return the Stripe checkout URL
    });
  } catch (error) {
    console.log(error);
  }
};

export const stripeWebhook = async (req, res) => {
   console.log("hitting webhool");
  let event;
  const endpointSecret = process.env.WEBHOOK_ENDPOINT_SECRET;

  try {
    const sig = req.headers['stripe-signature'];
    const body = req.rawBody || JSON.stringify(req.body); // rawBody if using express.raw()

    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (error) {
    console.error("❌ Webhook verification failed:", error.message);
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    try {
      const purchase = await CoursePurchase.findOne({ paymentId: session.id });

      if (!purchase) {
        console.log("⚠️ Purchase record not found for session:", session.id);
        return res.status(404).send("Purchase not found");
      }

      purchase.status = "completed";
      await purchase.save();

      console.log("✅ Purchase status updated to completed for:", session.id);
    } catch (error) {
      console.error("Error updating purchase status:", error);
      return res.status(500).send("Internal Server Error");
    }
  }

  res.status(200).send();
};


export const getCourseDetailWithPurchaseStatus = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.id;

    const course = await Course.findById(courseId)
      .populate({ path: "creator" })
      .populate({ path: "lectures" });

    if (!course) {
      return res.status(404).json({ message: "course not found!" });
    }

    const purchased = await CoursePurchase.findOne({ userId, courseId });

    if (purchased) {
      if (purchased.status !== "completed") {
        purchased.status = "completed";
        await purchased.save();
      }

      await User.findByIdAndUpdate(
        userId,
        { $addToSet: { enrolledCourses: courseId } },
        { new: true }
      );

      await Course.findByIdAndUpdate(
        courseId,
        { $addToSet: { enrolledStudents: userId } },
        { new: true }
      );
    }

    console.log(`Purchased record for courseId ${courseId} and userId ${userId}:`, purchased);

    return res.status(200).json({
      course,
      purchased: !!purchased, // true if purchased, false otherwise
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Something went wrong" });
  }
};


export const getAllPurchasedCourse = async (req, res) => {
  try {

     const instructorId = req.id; // assumes user is authenticated and req.id is set

    // Get courses created by the current instructor
    const instructorCourses = await Course.find({ creator: instructorId }).select("_id");

    const courseIds = instructorCourses.map(course => course._id);

    if (courseIds.length === 0) {
      return res.status(200).json({ purchasedCourse: [] });
    }

console.log("Instructor ID:", instructorId);
console.log("Instructor's course IDs:", courseIds);

    const purchasedCourse = await CoursePurchase.find({
       courseId: { $in: courseIds },
      status: "completed",
    }).populate("courseId");
    if (!purchasedCourse) {
      return res.status(404).json({
        purchasedCourse: [],
      });
    }
    return res.status(200).json({
      purchasedCourse,
    });
  } catch (error) {
    console.log(error);
  }
};


