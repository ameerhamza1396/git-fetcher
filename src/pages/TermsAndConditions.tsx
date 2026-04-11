import { ArrowLeft } from 'lucide-react';
import Seo from '@/components/Seo';

const TermsAndConditions = () => {

  // Markdown content for the Terms and Conditions (replace with the content above)
  const termsAndConditionsContent = `
# Terms and Conditions

**Last updated:** June 12, 2025

These Terms and Conditions outline the rules and regulations for the use of Medistics.app's Website, an MCAT Learning platform integrated with Artificial Intelligence.

By accessing this website we assume you accept these terms and conditions. Do not continue to use Medistics.app if you do not agree to take all of the terms and conditions stated on this page.

---

## Interpretation and Definitions

### Interpretation

The words of which the initial letter is capitalized have meanings defined
under the following conditions. The following definitions shall have the same
meaning regardless of whether they appear in singular or in plural.

### Definitions

For the purposes of these Terms and Conditions:

* **Account** means a unique account created for You to access our Service or
    parts of our Service.

* **Affiliate** means an entity that controls, is controlled by or is under
    common control with a party, where "control" means ownership of 50% or
    more of the shares, equity interest or other securities entitled to vote
    for election of directors or other managing authority.

* **Company** (referred to as either "the Company", "We", "Us" or "Our" in this
    Agreement) refers to Medistics.app, L13, KDA Flats, Sector 5E Surjani
    Town, Karachi.

* **Country** refers to: Pakistan

* **Device** means any device that can access the Service such as a computer, a
    cellphone or a digital tablet.

* **Service** refers to the Website, specifically the MCAT Learning platform integrated with Artificial Intelligence.

* **Service Provider** means any natural or legal person who processes the data
    on behalf of the Company. It refers to third-party companies or
    individuals employed by the Company to facilitate the Service, to provide
    the Service on behalf of the Company, to perform services related to the
    Service or to assist the Company in analyzing how the Service is used.

* **Third-party Social Media Service** refers to any website or any social
    network website through which a User can log in or create an account to
    use the Service.

* **Website** refers to Medistics.app, accessible from
    [medistics.app](medistics.app)

* **You** means the individual accessing or using the Service, or the company,
    or other legal entity on behalf of which such individual is accessing or
    using the Service, as applicable.

---

## Cookies

We employ the use of cookies. By accessing Medistics.app, you agreed to use cookies in agreement with the Medistics.app's Privacy Policy.

---

## License

Unless otherwise stated, Medistics.app and/or its licensors own the intellectual property rights for all material on Medistics.app. All intellectual property rights are reserved. You may access this from Medistics.app for your own personal use subject to restrictions set in these terms and conditions.

You must not:

* Republish material from Medistics.app
* Sell, rent or sub-license material from Medistics.app
* Reproduce, duplicate or copy material from Medistics.app
* Redistribute content from Medistics.app

Specifically, regarding the AI integration:

* You must not reverse engineer, decompile, or disassemble any part of the AI models, algorithms, or underlying systems.
* You must not attempt to extract data, training sets, or intellectual property from the AI models.

---

## Hyperlinking to our Content

The following organizations may link to our Website without prior written approval:

* Government agencies
* Search engines

Anyone can link to Medistics.app. The link must not be in any way deceptive and must not falsely imply sponsorship, endorsement or approval of the linking party and its products or services, and must fit within the context of the linking party’s site.

---

## Content Liability

We shall not be held responsible for any content that appears on your Website. You agree to protect and defend us against all claims that is rising on your Website. No link(s) should appear on any Website that may be interpreted as libelous, obscene or criminal, or which infringes, otherwise violates, or advocates the infringement or other violation of, any third party rights.

---

## Reservation of Rights

We reserve the right to request that you remove all links or any particular link to our Website. You approve to immediately remove all links to our Website upon request. We also reserve the right to amend these terms and conditions and its linking policy at any time. By continuously linking to our Website, you agree to be bound to and follow these linking terms and conditions.

---

## Removal of links from our website

If you find any link on our Website that is offensive for any reason, you are free to contact and inform us any moment. We will consider requests to remove links but we are not obligated to or so or to respond to you directly.

---

## Disclaimer

To the maximum extent permitted by applicable law, we exclude all representations, warranties and conditions relating to our website and the use of this website. Nothing in this disclaimer will:

* limit or exclude our or your liability for death or personal injury;
* limit or exclude our or your liability for fraud or fraudulent misrepresentation;
* limit any of our or your liabilities in any way that is not permitted under applicable law; or
* exclude any of our or your liabilities that may not be excluded under applicable law.

The limitations and prohibitions of liability set in this Section and elsewhere in this disclaimer: (a) are subject to the preceding paragraph; and (b) govern all liabilities arising under the disclaimer, including liabilities arising in contract, in tort and for breach of statutory duty.

While we strive to provide accurate and up-to-date information through Medistics.app, we do not warrant the completeness or accuracy of the information presented on this website. We also do not guarantee that the website will remain available or that the material on the website will be kept up to date. The MCAT learning content and AI-generated insights are provided for educational purposes only and should not be considered a substitute for professional advice or comprehensive study resources. Your reliance on any information provided by the Service is solely at your own risk. As long as the website and the information and services on the website are provided free of charge, we will not be liable for any loss or damage of any nature.

---

## Contact Us

If you have any questions about these Terms and Conditions, you can contact us:

* By email: [medistics@dr.com](mailto:medistics@dr.com)

* By visiting this page on our website:
    [instagram.com/medistics.app](https://instagram.com/medistics.app)
`;

  return (
    <div className="min-h-screen w-full bg-background">
      <Seo
        title="Terms and Conditions"
        description="Read the terms and conditions for using Medistics App services. Your agreement to these terms is required for usage."
        canonical="https://medistics.app/terms"
      />

      <div className="container mx-auto px-4 lg:px-8 py-8 max-w-4xl pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4 text-center">
            Terms and Conditions
          </h1>
          <div className="text-muted-foreground leading-relaxed space-y-4">
            <pre className="whitespace-pre-wrap text-sm">{termsAndConditionsContent}</pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsAndConditions;
